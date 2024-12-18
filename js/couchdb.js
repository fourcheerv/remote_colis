// Initialisation de PouchDB pour la synchronisation avec CouchDB
const localDB = new PouchDB('receptions');
const remoteDB = new PouchDB('https://apikey-v2-237azo7t1nwttyu787vl2zuxfh5ywxrddnfhcujd2nbu:b7ce3f8c0a99a10c0825a4c1ff68fe62@ca3c9329-df98-4982-a3dd-ba2b294b02ef-bluemix.cloudantnosqldb.appdomain.cloud/receptions');

// Initialisation pagination
let currentPage = 1;
const rowsPerPage = 20; // Nombre de lignes par page
let totalRows = 0; // Total des lignes disponibles

// Synchronisation avec CouchDB
localDB.sync(remoteDB, { live: true, retry: true }).on('error', console.error);

// Charger les données dans le tableau
const loadData = async (page = 1) => {
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = ""; // Vider le tableau avant de recharger les données

    try {
        const result = await localDB.allDocs({ include_docs: true });
        totalRows = result.rows.length;
        const startIndex = (page - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;

        const paginatedRows = result.rows.slice(startIndex, endIndex);

        paginatedRows.forEach(row => {
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
                    ${signature ? `<img src="${signature}" alt="Signature" class="table-img" onclick="showImage('${signature}')">` : "Aucune"}
                </td>
                <td>
                    ${(photos || [])
                        .map(photo => `<img src="${photo}" alt="Photo" class="table-img" onclick="showImage('${photo}')">`)
                        .join("") || "Aucune"}
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

        updatePaginationInfo();
    } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
    }
};

// Mise à jour du statut de livraison
document.addEventListener("change", async (event) => {
    if (event.target.classList.contains("updateDeliveredStatus")) {
        const docId = event.target.dataset.id;
        const newValue = event.target.value === "true" ? "true" : "false";

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

// Mise à jour de la pagination
const updatePaginationInfo = () => {
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    document.getElementById("pageInfo").textContent = `Page ${currentPage} sur ${totalPages}`;
    document.getElementById("prevPageBtn").disabled = currentPage === 1;
    document.getElementById("nextPageBtn").disabled = currentPage === totalPages;
};


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

// Fonction pour compacter la base CouchDB
const compactDatabase = async (remoteDBName, username, password) => {
    try {
        // Construire l'URL de compaction
        const url = `${remoteDBName}/_compact`;

        // Construire l'en-tête Authorization avec Basic Auth
        const authHeader = "Basic " + btoa(`${username}:${password}`);

        // Effectuer la requête POST
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
            },
        });

        // Vérifier la réponse
        if (response.ok) {
            alert("Compaction lancée avec succès. Cela peut prendre un moment.");
        } else {
            const errorData = await response.json();
            console.error("Erreur lors de la compaction :", errorData);
            alert(`Erreur lors de la compaction : ${errorData.reason || "Inconnue"}`);
        }
    } catch (error) {
        console.error("Erreur lors de la compaction :", error);
        alert(`Une erreur est survenue lors de la compaction : ${error.message}`);
    }
};

// Exemple d'appel de la fonction
const remoteDBName = "https://ca3c9329-df98-4982-a3dd-ba2b294b02ef-bluemix.cloudantnosqldb.appdomain.cloud/receptions";
const username = "apikey-v2-237azo7t1nwttyu787vl2zuxfh5ywxrddnfhcujd2nbu"; // Remplacez par votre nom d'utilisateur
const password = "b7ce3f8c0a99a10c0825a4c1ff68fe62"; // Remplacez par votre clé secrète

// Fonction pour purger la base CouchDB
const purgeDatabase = async (remoteDB, username, password) => {
    try {
        if (!remoteDB || !username || !password) {
            throw new Error("Les paramètres 'remoteDB', 'username' ou 'password' sont manquants.");
        }

        // Récupérer tous les documents depuis la base distante
        const result = await remoteDB.allDocs({ include_docs: true });

        const docsToPurge = result.rows
            .filter(row => row.doc && row.doc._deleted)
            .map(row => ({
                _id: row.doc._id,
                _rev: row.doc._rev,
                _deleted: true
            }));

        if (docsToPurge.length === 0) {
            alert("Aucun document à purger !");
            return;
        }

        // Envoyer les documents à supprimer
        const response = await remoteDB.bulkDocs(docsToPurge);

        // Vérifier les erreurs
        const errors = response.filter(res => res.error);
        if (errors.length > 0) {
            console.error("Erreurs lors de la purge :", errors);
            alert("Certaines suppressions ont échoué.");
        } else {
            alert("Base purgée avec succès !");
        }
    } catch (error) {
        console.error("Erreur lors de la purge :", error);
        alert(`Une erreur est survenue lors de la purge : ${error.message}`);
    }
};

// Exporter les données au format Excel
const exportToExcel = async () => {
    try {
        const result = await localDB.allDocs({ include_docs: true });
        const data = result.rows.map(row => ({
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

// Exporter les données au format ZIP
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

// Afficher une image dans une pop-up
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

// Sélectionner ou désélectionner toutes les lignes
document.getElementById("selectAll").addEventListener("change", (event) => {
    const checkboxes = document.querySelectorAll(".selectRow");
    checkboxes.forEach(checkbox => (checkbox.checked = event.target.checked));
});

// Ajouter les événements aux boutons
document.getElementById("searchBtn").addEventListener("click", searchData);
document.getElementById("deleteSelectedBtn").addEventListener("click", deleteSelected);
document.getElementById("exportBtn").addEventListener("click", exportToExcel);
document.getElementById("exportZipBtn").addEventListener("click", exportToZip);

document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        loadData(currentPage);
    }
});

document.getElementById("nextPageBtn").addEventListener("click", () => {
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        loadData(currentPage);
    }
});


document.getElementById("compactBtn").addEventListener("click", () => {
    const confirmation = confirm("Voulez-vous vraiment lancer la compaction de la base ? Cela peut prendre du temps.");
    if (confirmation) compactDatabase(remoteDBName, username, password);

});

document.getElementById("purgeBtn").addEventListener("click", () => {
    const confirmation = confirm("Voulez-vous vraiment purger tous les éléments supprimés ?");
    if (confirmation) purgeDatabase(remoteDB, username, password);
});


// Charger les données au démarrage
window.addEventListener("DOMContentLoaded", () => loadData(currentPage));
