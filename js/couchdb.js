// Initialisation de PouchDB pour la synchronisation avec CouchDB
const localDB = new PouchDB('receptions');
const remoteDB = new PouchDB('https://apikey-v2-237azo7t1nwttyu787vl2zuxfh5ywxrddnfhcujd2nbu:b7ce3f8c0a99a10c0825a4c1ff68fe62@ca3c9329-df98-4982-a3dd-ba2b294b02ef-bluemix.cloudantnosqldb.appdomain.cloud/receptions');
//Pagination
let currentPage = 1;
const rowsPerPage = 20;
let allSortedRows = [];

// Tri initial
let sortOrder = 'desc';

// Synchronisation avec CouchDB
localDB.sync(remoteDB, { live: true, retry: true }).on('error', console.error);

// Fonction pour charger les données

const parseDate = (str) => {
    if (!str) return new Date(0);
    const [datePart, timePart] = str.split(' ');
    const [day, month, year] = datePart.split('/');
    return new Date(`${year}-${month}-${day}T${timePart || '00:00'}:00`);
};

const loadData = async () => {
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";

    try {
        const result = await localDB.allDocs({ include_docs: true });

        allSortedRows = result.rows.sort((a, b) => {
            const dateA = parseDate(a.doc.deliveryDate);
            const dateB = parseDate(b.doc.deliveryDate);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        // Pagination
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageRows = allSortedRows.slice(start, end);

        // Met à jour l'en-tête du tri
        document.getElementById("sortDeliveryDate").innerHTML =
            `Date de réception ${sortOrder === 'asc' ? '&#8593;' : '&#8595;'}`;

        // Remplit le tableau
        pageRows.forEach(row => {
            const { _id, recipientName, receiverName, serviceEmail, packageCount, deliveryDate, signature, photos, delivered } = row.doc;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><input type="checkbox" class="selectRow" data-id="${_id}"></td>
                <td>${_id}</td>
                <td>${recipientName || "N/A"}</td>
                <td>${receiverName || "N/A"}</td>
                <td>${serviceEmail || "N/A"}</td>
                <td>${packageCount || 0}</td>
                <td>${deliveryDate || "Non défini"}</td>
                <td>
                    ${signature ? 
   `<img src="${signature}" alt="Signature de ${receiverName || 'N/A'}" class="table-img" tabindex="0" onclick="showImage('${signature}')">`
   : "Aucune"}
                </td>
                <td>
                    ${(photos || []).map((photo, i) => 
   `<img src="${photo}" alt="Photo ${i + 1} de ${receiverName || 'N/A'}" class="table-img" tabindex="0" onclick="showImage('${photo}')">`
).join("") || "Aucune"}

                </td>
                <td>
                    <select class="updateDeliveredStatus" data-id="${_id}">
                        <option value="true" ${delivered === "true" ? "selected" : ""}>Oui</option>
                        <option value="false" ${delivered === "false" ? "selected" : ""}>Non</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });

        updatePaginationControls();

    } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
    }
};

// Mise à jour du statut de livraison
document.addEventListener("change", async (event) => {
    if (event.target.classList.contains("updateDeliveredStatus")) {
        const docId = event.target.dataset.id;
        const newValue = event.target.value;

        try {
            const doc = await localDB.get(docId);
            doc.delivered = newValue;
            await localDB.put(doc);
            alert("Statut de livraison mis à jour avec succès !");
        } catch (error) {
            console.error("Erreur lors de la mise à jour :", error);
            alert("Impossible de mettre à jour le statut.");
        }
    }
});

// Recherche dans le tableau
const searchData = () => {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#dataTable tbody tr");

    rows.forEach(row => {
        const rowText = row.textContent.toLowerCase();
        row.style.display = rowText.includes(query) ? "" : "none";
    });
};

// Supprimer les éléments sélectionnés
const deleteSelected = async () => {
    const checkboxes = document.querySelectorAll(".selectRow:checked");
    if (checkboxes.length === 0) {
        alert("Aucun élément sélectionné !");
        return;
    }

    const confirmed = confirm("Voulez-vous vraiment supprimer les éléments sélectionnés ?");
    if (!confirmed) return;

    try {
        for (const checkbox of checkboxes) {
            const doc = await localDB.get(checkbox.dataset.id);
            await localDB.remove(doc);
        }
        alert("Éléments supprimés avec succès !");
        loadData();
    } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        alert("Une erreur est survenue lors de la suppression.");
    }
};

// Export Excel
const exportToExcel = async () => {
    try {
        const result = await localDB.allDocs({ include_docs: true });

        const sortedRows = result.rows.sort((a, b) => {
        const dateA = parseDate(a.doc.deliveryDate);
        const dateB = parseDate(b.doc.deliveryDate);
        return dateB - dateA;
        });

        const data = sortedRows.map(row => ({
            ID: row.doc._id,
            Destinataire: row.doc.recipientName || "N/A",
            Réceptionnaire: row.doc.receiverName || "N/A",
            Email: row.doc.serviceEmail || "N/A",
            "Nombre de colis": row.doc.packageCount || 0,
            "Date de réception": row.doc.deliveryDate || "Non défini"
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Données");
        XLSX.writeFile(workbook, "Export_Données.xlsx");
    } catch (error) {
        console.error("Erreur lors de l'export :", error);
        alert("Une erreur est survenue lors de l'export.");
    }
};

// Export ZIP
const exportToZip = async () => {
    try {
        const result = await localDB.allDocs({ include_docs: true });
        const data = result.rows.map(row => row.doc);

        if (data.length === 0) {
            alert("Aucune donnée à exporter !");
            return;
        }

        const zip = new JSZip();

        for (const item of data) {
            const folder = zip.folder(`ID_${item._id}`);
            const jsonContent = {
                id: item._id,
                recipientName: item.recipientName,
                receiverName: item.receiverName,
                serviceEmail: item.serviceEmail,
                packageCount: item.packageCount,
                deliveryDate: item.deliveryDate,
                delivered: item.delivered,
            };
            folder.file("info.json", JSON.stringify(jsonContent, null, 2));

            if (item.signature) {
                const signatureBlob = await fetch(item.signature).then(res => res.blob());
                folder.file("signature.png", signatureBlob);
            }

            if (item.photos) {
                for (let i = 0; i < item.photos.length; i++) {
                    const photoBlob = await fetch(item.photos[i]).then(res => res.blob());
                    folder.file(`photo_${i + 1}.png`, photoBlob);
                }
            }
        }

        zip.generateAsync({ type: "blob" }).then((content) => {
            saveAs(content, "Receptions.zip");
            alert("Fichier ZIP exporté avec succès !");
        });
    } catch (error) {
        console.error("Erreur lors de l'exportation ZIP :", error);
    }
};

// Affichage de l'image
const showImage = (src) => {
    const popup = document.getElementById("imagePopup");
    const popupImage = document.getElementById("popupImage");
    popupImage.src = src;
    popup.style.display = "flex";
};

// Fermer la pop-up d'image
document.getElementById("closePopup").addEventListener("click", () => {
    document.getElementById("imagePopup").style.display = "none";
});

// Sélectionner tout
document.getElementById("selectAll").addEventListener("change", (event) => {
    const checkboxes = document.querySelectorAll(".selectRow");
    checkboxes.forEach(checkbox => (checkbox.checked = event.target.checked));
});

// Boutons
document.getElementById("searchBtn").addEventListener("click", searchData);
document.getElementById("deleteSelectedBtn").addEventListener("click", deleteSelected);
document.getElementById("exportBtn").addEventListener("click", exportToExcel);
document.getElementById("exportZipBtn").addEventListener("click", exportToZip);

// Tri dynamique sur l'en-tête
document.getElementById("sortDeliveryDate").addEventListener("click", () => {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    document.getElementById("sortDeliveryDate").innerHTML =
        `Date de réception ${sortOrder === 'asc' ? '&#8593;' : '&#8595;'}`;
    loadData();
});

// Chargement initial
window.addEventListener("DOMContentLoaded", () => {
    loadData();
});


//Pagination
const updatePaginationControls = () => {
    const totalPages = Math.ceil(allSortedRows.length / rowsPerPage);
    const container = document.getElementById("paginationControls");
    container.innerHTML = "";

    // Bouton "Début"
    const firstBtn = document.createElement("button");
    firstBtn.textContent = "⏮ Début";
    firstBtn.disabled = currentPage === 1;
    firstBtn.addEventListener("click", () => {
        currentPage = 1;
        loadData();
    });
    container.appendChild(firstBtn);

    // Précédent
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "◀";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            loadData();
        }
    });
    container.appendChild(prevBtn);

    // Infos de page
    const pageInfo = document.createElement("span");
    pageInfo.textContent = ` Page ${currentPage} / ${totalPages} `;
    container.appendChild(pageInfo);

    // Suivant
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "▶";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadData();
        }
    });
    container.appendChild(nextBtn);

    // Bouton "Fin"
    const lastBtn = document.createElement("button");
    lastBtn.textContent = "Fin ⏭";
    lastBtn.disabled = currentPage === totalPages;
    lastBtn.addEventListener("click", () => {
        currentPage = totalPages;
        loadData();
    });
    container.appendChild(lastBtn);
};

