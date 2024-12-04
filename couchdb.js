// Initialisation de PouchDB pour la synchronisation avec CouchDB
const localDB = new PouchDB('receptions');
const remoteDB = new PouchDB('https://your-database-url');

// Synchronisation avec CouchDB
localDB.sync(remoteDB, { live: true, retry: true }).on('error', console.error);

// Charger les données dans le tableau
const loadData = async () => {
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = ""; // Vider le tableau avant de recharger les données

    try {
        const result = await localDB.allDocs({ include_docs: true });
        result.rows.forEach(row => {
            const { _id, recipientName, receiverName, email, packageCount, deliveryDate, signature, photos } = row.doc;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><input type="checkbox" class="selectRow" data-id="${_id}"></td>
                <td>${_id}</td>
                <td>${recipientName || "N/A"}</td>
                <td>${receiverName || "N/A"}</td>
                <td>${email || "N/A"}</td>
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
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
    }
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

// Exporter les données au format Excel
const exportToExcel = async () => {
    try {
        const result = await localDB.allDocs({ include_docs: true });
        const data = result.rows.map(row => ({
            ID: row.doc._id,
            Destinataire: row.doc.recipientName || "N/A",
            Réceptionnaire: row.doc.receiverName || "N/A",
            Email: row.doc.email || "N/A",
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

// Charger les données au démarrage
window.addEventListener("DOMContentLoaded", loadData);