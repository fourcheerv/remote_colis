const COUCHDB_URL = 'https://apikey-v2-237azo7t1nwttyu787vl2zuxfh5ywxrddnfhcujd2nbu:b7ce3f8c0a99a10c0825a4c1ff68fe62@ca3c9329-df98-4982-a3dd-ba2b294b02ef-bluemix.cloudantnosqldb.appdomain.cloud/receptions';
const localDB = new PouchDB('receptions');
const remoteDB = new PouchDB(COUCHDB_URL);

let currentPage = 1;
const rowsPerPage = 20;
let allSortedRows = [];
let filteredRows = [];
let sortOrder = 'desc';
let editModalPhotos = [];
let editModalSignature = '';
const selectedDocs = new Set();

const updateSyncStatus = (state, message) => {
    const banner = document.getElementById('syncStatusBanner');
    const text = document.getElementById('syncStatusText');
    if (!banner || !text) return;

    banner.classList.remove('is-pending', 'is-syncing', 'is-ok', 'is-warning', 'is-error');
    banner.classList.add(state);
    text.textContent = message;
};

updateSyncStatus('is-syncing', 'Synchronisation initiale avec CouchDB en cours...');

localDB.sync(remoteDB, { live: true, retry: true })
    .on('active', () => updateSyncStatus('is-syncing', 'Synchronisation en cours avec CouchDB...'))
    .on('change', () => {
        updateSyncStatus('is-syncing', 'Mise à jour des données en cours...');
        loadData();
    })
    .on('paused', (error) => {
        if (error) {
            updateSyncStatus('is-warning', 'Synchronisation en pause. Nouvelle tentative automatique...');
            return;
        }
        const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
        updateSyncStatus(
            isOffline ? 'is-warning' : 'is-ok',
            isOffline
                ? 'Mode hors ligne. Les changements seront synchronisés quand la connexion reviendra.'
                : 'Toutes les données sont synchronisées avec CouchDB.'
        );
    })
    .on('error', (error) => {
        console.error('Erreur de synchronisation :', error);
        const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
        updateSyncStatus(
            isOffline ? 'is-warning' : 'is-error',
            isOffline
                ? 'Connexion internet indisponible. Synchronisation en attente.'
                : 'Erreur de synchronisation avec CouchDB. Nouvelle tentative automatique...'
        );
    });

window.addEventListener('online', () => updateSyncStatus('is-pending', 'Connexion rétablie. Reprise de la synchronisation...'));
window.addEventListener('offline', () => updateSyncStatus('is-warning', 'Mode hors ligne. Les changements seront synchronisés plus tard.'));

const modalManager = {
    currentModal: null,

    openModal(content) {
        this.closeCurrent();
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = content;
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                resetEditAssets();
                this.closeCurrent();
            }
        });
        document.body.appendChild(modal);
        this.currentModal = modal;
        return modal;
    },

    closeCurrent() {
        if (!this.currentModal) return;
        this.currentModal.remove();
        this.currentModal = null;
    }
};

const parseDate = (value) => {
    if (!value) return new Date(0);
    const [datePart, timePart] = String(value).split(' ');
    if (!datePart) return new Date(0);
    const [day, month, year] = datePart.split('/');
    if (!day || !month || !year) return new Date(value);
    return new Date(`${year}-${month}-${day}T${timePart || '00:00'}:00`);
};

const formatDateTimeForInput = (value) => {
    const date = parseDate(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateTimeForStorage = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatDateOnly = (value) => {
    const date = parseDate(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const compresserImage = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = (image.height / image.width) * 800;
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(callback, 'image/jpeg', 0.7);
        };
        image.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

const resetEditAssets = () => {
    editModalPhotos = [];
    editModalSignature = '';
};

const getSearchableText = (doc) => [
    doc._id,
    doc.recipientName,
    doc.receiverName,
    doc.serviceEmail,
    doc.deliveryDate,
    doc.delivered
].join(' ').toLowerCase();

const renderImageButton = (src, alt) => `
    <button type="button" class="image-preview" data-src="${escapeHtml(src)}" aria-label="Afficher ${escapeHtml(alt)}">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="table-img">
    </button>
`;

const renderPhotoCollection = (photos, receiverName) => {
    if (!photos || photos.length === 0) return 'Aucune';
    return photos.map((photo, index) => renderImageButton(photo, `Photo ${index + 1} de ${receiverName || 'N/A'}`)).join('');
};

const updateResultsSummary = () => {
    const summary = document.getElementById('resultsSummary');
    if (!summary) return;
    const total = allSortedRows.length;
    const filtered = filteredRows.length;
    summary.textContent = `${filtered} résultat${filtered > 1 ? 's' : ''} affiché${filtered > 1 ? 's' : ''} sur ${total}`;
};

const updateSelectedSummary = () => {
    const node = document.getElementById('selectedSummary');
    if (!node) return;
    node.textContent = `${selectedDocs.size} élément${selectedDocs.size > 1 ? 's' : ''} sélectionné${selectedDocs.size > 1 ? 's' : ''}`;
};

const updateStats = () => {
    const docs = filteredRows.map((row) => row.doc);
    const today = formatDateOnly(new Date().toLocaleString('fr-FR'));
    const now = new Date();
    const last7 = new Date(now);
    last7.setDate(now.getDate() - 7);

    const total = docs.length;
    const pending = docs.filter((doc) => String(doc.delivered) === 'false').length;
    const delivered = docs.filter((doc) => String(doc.delivered) === 'true').length;
    const todayCount = docs.filter((doc) => formatDateOnly(doc.deliveryDate) === formatDateOnly(now.toLocaleString('fr-FR'))).length;
    const last7Count = docs.filter((doc) => parseDate(doc.deliveryDate) >= last7).length;
    const withPhotos = docs.filter((doc) => Array.isArray(doc.photos) && doc.photos.length > 0).length;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statDelivered').textContent = delivered;
    document.getElementById('statToday').textContent = todayCount;
    document.getElementById('statLast7Days').textContent = last7Count;
    document.getElementById('statWithPhotos').textContent = withPhotos;
};

const applyFilters = () => {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const dateFilter = document.getElementById('dateFilter').value;
    const deliveredFilter = document.getElementById('deliveredFilter').value;

    filteredRows = allSortedRows.filter((row) => {
        const doc = row.doc;
        if (query && !getSearchableText(doc).includes(query)) return false;
        if (dateFilter && formatDateOnly(doc.deliveryDate) !== dateFilter) return false;
        if (deliveredFilter && String(doc.delivered) !== deliveredFilter) return false;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    updateResultsSummary();
    updateStats();
    renderTable();
};

const getExportRows = () => filteredRows.map((row) => row.doc);

const renderTable = () => {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    const start = (currentPage - 1) * rowsPerPage;
    const pageRows = filteredRows.slice(start, start + rowsPerPage);

    if (pageRows.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="11">Aucune donnée trouvée.</td>';
        tbody.appendChild(tr);
        updatePaginationControls();
        updateSelectAllState();
        return;
    }

    pageRows.forEach((row) => {
        const { _id, recipientName, receiverName, serviceEmail, packageCount, deliveryDate, signature, photos, delivered } = row.doc;
        const checked = selectedDocs.has(_id) ? 'checked' : '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="selectRow" data-id="${escapeHtml(_id)}" ${checked}></td>
            <td>${escapeHtml(_id)}</td>
            <td>${escapeHtml(recipientName || 'N/A')}</td>
            <td>${escapeHtml(receiverName || 'N/A')}</td>
            <td>${escapeHtml(serviceEmail || 'N/A')}</td>
            <td>${escapeHtml(packageCount ?? 0)}</td>
            <td>${escapeHtml(deliveryDate || 'Non défini')}</td>
            <td>${signature ? renderImageButton(signature, `Signature de ${receiverName || 'N/A'}`) : 'Aucune'}</td>
            <td>${renderPhotoCollection(photos || [], receiverName)}</td>
            <td>
                <select class="updateDeliveredStatus status-select" data-id="${escapeHtml(_id)}">
                    <option value="true" ${delivered === 'true' ? 'selected' : ''}>Oui</option>
                    <option value="false" ${delivered === 'false' ? 'selected' : ''}>Non</option>
                </select>
            </td>
            <td>
                <div class="action-buttons">
                    <button type="button" class="btn-secondary details-btn" data-id="${escapeHtml(_id)}">Voir</button>
                    <button type="button" class="btn-edit edit-btn" data-id="${escapeHtml(_id)}">Modifier</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updatePaginationControls();
    updateSelectAllState();
    updateSelectedSummary();
};

const loadData = async () => {
    try {
        const result = await localDB.allDocs({ include_docs: true });
        allSortedRows = result.rows.sort((a, b) => {
            const dateA = parseDate(a.doc.deliveryDate);
            const dateB = parseDate(b.doc.deliveryDate);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
        document.getElementById('sortDeliveryDate').innerHTML = `Date de réception ${sortOrder === 'asc' ? '&#8593;' : '&#8595;'}`;
        applyFilters();
    } catch (error) {
        console.error('Erreur lors du chargement des données :', error);
        updateSyncStatus('is-error', 'Impossible de charger les données locales.');
    }
};

const resetFilters = () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('dateFilter').value = '';
    document.getElementById('deliveredFilter').value = '';
    currentPage = 1;
    applyFilters();
};

const deleteSelected = async () => {
    if (selectedDocs.size === 0) {
        alert('Aucun élément sélectionné !');
        return;
    }
    if (!confirm(`Voulez-vous vraiment supprimer ${selectedDocs.size} élément(s) ?`)) return;

    try {
        for (const docId of selectedDocs) {
            const doc = await localDB.get(docId);
            await localDB.remove(doc);
        }
        selectedDocs.clear();
        alert('Éléments supprimés avec succès !');
        loadData();
    } catch (error) {
        console.error('Erreur lors de la suppression :', error);
        alert('Une erreur est survenue lors de la suppression.');
    }
};

const exportToCsv = () => {
    const data = getExportRows();
    if (data.length === 0) {
        alert('Aucune donnée filtrée à exporter.');
        return;
    }
    const rows = [
        ['ID', 'Destinataire', 'Réceptionnaire', 'Email', 'Nombre de colis', 'Date de réception', 'Colis livré']
    ];
    data.forEach((doc) => {
        rows.push([
            doc._id,
            doc.recipientName || 'N/A',
            doc.receiverName || 'N/A',
            doc.serviceEmail || 'N/A',
            doc.packageCount || 0,
            doc.deliveryDate || 'Non défini',
            doc.delivered === 'true' ? 'Oui' : 'Non'
        ]);
    });
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'Export_Donnees_Filtres.csv');
};

const exportToExcel = async () => {
    try {
        const dataRows = getExportRows();
        if (dataRows.length === 0) {
            alert('Aucune donnée filtrée à exporter.');
            return;
        }
        const data = dataRows.map((doc) => ({
            ID: doc._id,
            Destinataire: doc.recipientName || 'N/A',
            Réceptionnaire: doc.receiverName || 'N/A',
            Email: doc.serviceEmail || 'N/A',
            'Nombre de colis': doc.packageCount || 0,
            'Date de réception': doc.deliveryDate || 'Non défini',
            'Colis livré': doc.delivered === 'true' ? 'Oui' : 'Non'
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Données filtrées');
        XLSX.writeFile(workbook, 'Export_Donnees_Filtres.xlsx');
    } catch (error) {
        console.error('Erreur lors de l\'export :', error);
        alert('Une erreur est survenue lors de l\'export.');
    }
};

const exportToZip = async () => {
    try {
        const data = getExportRows();
        if (data.length === 0) {
            alert('Aucune donnée filtrée à exporter.');
            return;
        }
        const zip = new JSZip();
        for (const item of data) {
            const folder = zip.folder(`ID_${item._id}`);
            folder.file('info.json', JSON.stringify({
                id: item._id,
                recipientName: item.recipientName,
                receiverName: item.receiverName,
                serviceEmail: item.serviceEmail,
                packageCount: item.packageCount,
                deliveryDate: item.deliveryDate,
                delivered: item.delivered
            }, null, 2));
            if (item.signature) {
                const signatureBlob = await fetch(item.signature).then((res) => res.blob());
                folder.file('signature.png', signatureBlob);
            }
            if (item.photos) {
                for (let index = 0; index < item.photos.length; index += 1) {
                    const photoBlob = await fetch(item.photos[index]).then((res) => res.blob());
                    folder.file(`photo_${index + 1}.png`, photoBlob);
                }
            }
        }
        zip.generateAsync({ type: 'blob' }).then((content) => {
            saveAs(content, 'Receptions_Filtres.zip');
            alert('Fichier ZIP filtré exporté avec succès !');
        });
    } catch (error) {
        console.error('Erreur lors de l\'exportation ZIP :', error);
        alert('Une erreur est survenue lors de l\'exportation ZIP.');
    }
};

const showImage = (src) => {
    const popup = document.getElementById('imagePopup');
    const popupImage = document.getElementById('popupImage');
    popupImage.src = src;
    popup.style.display = 'flex';
};

const formatFieldName = (key) => {
    const labels = {
        _id: 'ID',
        recipientName: 'Nom du destinataire',
        receiverName: 'Nom du réceptionnaire',
        serviceEmail: 'Email du réceptionnaire',
        packageCount: 'Nombre de colis',
        deliveryDate: 'Date de réception',
        delivered: 'Colis livré ?'
    };
    return labels[key] || key;
};

const getEditField = (key, value) => {
    if (key === '_id') {
        return `<input type="text" id="edit_${key}" class="form-control" data-field="${key}" value="${escapeHtml(value)}" readonly disabled>`;
    }
    if (key === 'deliveryDate') {
        return `<input type="datetime-local" id="edit_${key}" class="form-control" data-field="${key}" value="${escapeHtml(formatDateTimeForInput(value))}">`;
    }
    if (key === 'delivered') {
        return `<select id="edit_${key}" class="form-control" data-field="${key}"><option value="true" ${value === 'true' ? 'selected' : ''}>Oui</option><option value="false" ${value === 'false' ? 'selected' : ''}>Non</option></select>`;
    }
    if (key === 'packageCount') {
        return `<input type="number" min="1" id="edit_${key}" class="form-control" data-field="${key}" value="${escapeHtml(value ?? 1)}">`;
    }
    if (key === 'serviceEmail') {
        return `<input type="email" id="edit_${key}" class="form-control" data-field="${key}" value="${escapeHtml(value || '')}">`;
    }
    return `<input type="text" id="edit_${key}" class="form-control" data-field="${key}" value="${escapeHtml(value || '')}">`;
};

const generateEditFields = (doc) => {
    const preferredOrder = ['_id', 'recipientName', 'receiverName', 'serviceEmail', 'packageCount', 'deliveryDate', 'delivered'];
    const excludedKeys = new Set(['_rev', 'photos', 'signature']);
    const extraKeys = Object.keys(doc).filter((key) => !preferredOrder.includes(key) && !excludedKeys.has(key) && !key.startsWith('_'));
    const fieldOrder = [...preferredOrder.filter((key) => key === '_id' || Object.prototype.hasOwnProperty.call(doc, key)), ...extraKeys];
    return fieldOrder.map((key) => `
        <div class="form-group${String(doc[key] ?? '').length > 80 ? ' is-full' : ''}">
            <label for="edit_${key}">${formatFieldName(key)}</label>
            ${getEditField(key, doc[key])}
        </div>
    `).join('');
};

const renderModalPhotoPreviews = () => {
    const container = document.getElementById('previewContainerModal');
    const count = document.getElementById('photoCountModal');
    if (!container || !count) return;
    container.innerHTML = '';
    count.textContent = editModalPhotos.length;
    if (editModalPhotos.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucune photo enregistrée.</div>';
        return;
    }
    editModalPhotos.forEach((photo, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-image';
        const image = document.createElement('img');
        image.src = photo.dataUrl || photo;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-button';
        removeBtn.textContent = 'x';
        removeBtn.addEventListener('click', (event) => {
            event.preventDefault();
            editModalPhotos.splice(index, 1);
            renderModalPhotoPreviews();
        });
        wrapper.appendChild(image);
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    });
};

const renderSignaturePreview = () => {
    const container = document.getElementById('signaturePreviewModal');
    if (!container) return;
    container.innerHTML = '';
    if (!editModalSignature) {
        container.innerHTML = '<div class="empty-state">Aucune signature enregistrée.</div>';
        return;
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'signature-preview-item';
    const image = document.createElement('img');
    image.src = editModalSignature;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-button';
    removeBtn.textContent = 'x';
    removeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        editModalSignature = '';
        renderSignaturePreview();
    });
    wrapper.appendChild(image);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
};

const handleModalFiles = (fileList) => {
    const files = Array.from(fileList);
    if (editModalPhotos.length + files.length > 3) {
        alert('Maximum 3 photos !');
        return;
    }
    files.forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        compresserImage(file, async (blob) => {
            const dataUrl = await blobToDataUrl(blob);
            editModalPhotos.push({ dataUrl, existing: false });
            renderModalPhotoPreviews();
        });
    });
};

const handleSignatureFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    compresserImage(file, async (blob) => {
        editModalSignature = await blobToDataUrl(blob);
        renderSignaturePreview();
    });
};

const saveEditedDoc = async (docId) => {
    try {
        const doc = await localDB.get(docId);
        const inputs = document.querySelectorAll('#editForm [data-field]');
        inputs.forEach((input) => {
            const key = input.dataset.field;
            if (key === '_id') return;
            if (key === 'deliveryDate') {
                doc[key] = formatDateTimeForStorage(input.value);
                return;
            }
            if (key === 'packageCount') {
                const numericValue = Number(input.value);
                doc[key] = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1;
                return;
            }
            doc[key] = input.value.trim();
        });
        doc.signature = editModalSignature || '';
        doc.photos = editModalPhotos.map((photo) => photo.dataUrl || photo);
        await localDB.put(doc);
        alert('Modifications enregistrées avec succès !');
        resetEditAssets();
        modalManager.closeCurrent();
        loadData();
    } catch (error) {
        console.error('Erreur lors de la mise à jour :', error);
        alert('Impossible de mettre à jour l\'entrée.');
    }
};

const openDetailsModal = (doc) => {
    const photosHtml = (doc.photos || []).length
        ? `<div class="detail-item is-full"><strong>Photos</strong><div class="detail-gallery">${doc.photos.map((photo) => `<img src="${photo}" alt="Photo colis">`).join('')}</div></div>`
        : '';
    const signatureHtml = doc.signature
        ? `<div class="detail-item is-full"><strong>Signature</strong><div class="detail-gallery"><img src="${doc.signature}" alt="Signature"></div></div>`
        : '';

    const content = `
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2>Détail du colis</h2>
            <div class="detail-grid">
                <div class="detail-item"><strong>ID</strong>${escapeHtml(doc._id)}</div>
                <div class="detail-item"><strong>Destinataire</strong>${escapeHtml(doc.recipientName || 'N/A')}</div>
                <div class="detail-item"><strong>Réceptionnaire</strong>${escapeHtml(doc.receiverName || 'N/A')}</div>
                <div class="detail-item"><strong>Email</strong>${escapeHtml(doc.serviceEmail || 'N/A')}</div>
                <div class="detail-item"><strong>Nombre de colis</strong>${escapeHtml(doc.packageCount ?? 0)}</div>
                <div class="detail-item"><strong>Date de réception</strong>${escapeHtml(doc.deliveryDate || 'Non défini')}</div>
                <div class="detail-item"><strong>Colis livré</strong>${doc.delivered === 'true' ? 'Oui' : 'Non'}</div>
                ${signatureHtml}
                ${photosHtml}
            </div>
        </div>
    `;

    const modal = modalManager.openModal(content);
    modal.querySelector('.close-btn').addEventListener('click', () => modalManager.closeCurrent());
};

const setupEditModal = (doc) => {
    editModalPhotos = (doc.photos || []).map((photo) => ({ dataUrl: photo, existing: true }));
    editModalSignature = doc.signature || '';
    const modalContent = `
        <div class="edit-modal-content">
            <span class="close-btn">&times;</span>
            <h2>Modifier l'entrée</h2>
            <form id="editForm">
                ${generateEditFields(doc)}
                <div class="signature-section">
                    <h3>Signature</h3>
                    <div class="signature-actions">
                        <button type="button" id="replaceSignatureBtn" class="btn-edit">Remplacer la signature</button>
                        <button type="button" id="removeSignatureBtn" class="btn-secondary">Supprimer la signature</button>
                        <input type="file" id="signatureInputModal" accept="image/*" style="display:none;">
                    </div>
                    <p class="signature-help">La signature actuelle peut être remplacée par une image.</p>
                    <div id="signaturePreviewModal" class="signature-preview"></div>
                </div>
                <div class="photo-section">
                    <h3>Photos</h3>
                    <div class="photo-buttons">
                        <button type="button" id="takePhotoBtnModal" class="btn-edit">Prendre une photo</button>
                        <button type="button" id="chooseGalleryBtnModal" class="btn-secondary">Choisir depuis la galerie</button>
                        <input type="file" id="cameraInputModal" accept="image/*" capture="environment" style="display:none;">
                        <input type="file" id="galleryInputModal" accept="image/*" multiple style="display:none;">
                    </div>
                    <p class="photo-count">Photos : <span id="photoCountModal">0</span>/3</p>
                    <div id="previewContainerModal" class="preview-container"></div>
                </div>
            </form>
            <div class="modal-actions">
                <button type="button" id="saveEditBtn" class="btn-edit">Enregistrer</button>
                <button type="button" id="cancelEditBtn" class="btn-danger">Annuler</button>
            </div>
        </div>
    `;
    const modal = modalManager.openModal(modalContent);
    renderModalPhotoPreviews();
    renderSignaturePreview();
    modal.querySelector('.close-btn').addEventListener('click', () => { resetEditAssets(); modalManager.closeCurrent(); });
    modal.querySelector('#cancelEditBtn').addEventListener('click', () => { resetEditAssets(); modalManager.closeCurrent(); });
    modal.querySelector('#saveEditBtn').addEventListener('click', async () => saveEditedDoc(doc._id));
    modal.querySelector('#takePhotoBtnModal').addEventListener('click', () => modal.querySelector('#cameraInputModal').click());
    modal.querySelector('#chooseGalleryBtnModal').addEventListener('click', () => modal.querySelector('#galleryInputModal').click());
    modal.querySelector('#cameraInputModal').addEventListener('change', (event) => { handleModalFiles(event.target.files); event.target.value = ''; });
    modal.querySelector('#galleryInputModal').addEventListener('change', (event) => { handleModalFiles(event.target.files); event.target.value = ''; });
    modal.querySelector('#replaceSignatureBtn').addEventListener('click', () => modal.querySelector('#signatureInputModal').click());
    modal.querySelector('#removeSignatureBtn').addEventListener('click', () => { editModalSignature = ''; renderSignaturePreview(); });
    modal.querySelector('#signatureInputModal').addEventListener('change', (event) => { handleSignatureFile(event.target.files[0]); event.target.value = ''; });
};

const updateDeliveredStatus = async (docId, newValue) => {
    try {
        const doc = await localDB.get(docId);
        doc.delivered = newValue;
        await localDB.put(doc);
        alert('Statut de livraison mis à jour avec succès !');
        loadData();
    } catch (error) {
        console.error('Erreur lors de la mise à jour :', error);
        alert('Impossible de mettre à jour le statut.');
    }
};

const updatePaginationControls = () => {
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
    const container = document.getElementById('paginationControls');
    container.innerHTML = '';

    const firstBtn = document.createElement('button');
    firstBtn.textContent = '⏮ Début';
    firstBtn.disabled = currentPage === 1;
    firstBtn.addEventListener('click', () => { currentPage = 1; renderTable(); });
    container.appendChild(firstBtn);

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage -= 1; renderTable(); } });
    container.appendChild(prevBtn);

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
    container.appendChild(pageInfo);

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '▶';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage += 1; renderTable(); } });
    container.appendChild(nextBtn);

    const lastBtn = document.createElement('button');
    lastBtn.textContent = 'Fin ⏭';
    lastBtn.disabled = currentPage === totalPages;
    lastBtn.addEventListener('click', () => { currentPage = totalPages; renderTable(); });
    container.appendChild(lastBtn);
};

const updateSelectAllState = () => {
    const selectAll = document.getElementById('selectAll');
    const visibleCheckboxes = Array.from(document.querySelectorAll('.selectRow'));
    if (visibleCheckboxes.length === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
        return;
    }
    const checkedCount = visibleCheckboxes.filter((checkbox) => checkbox.checked).length;
    selectAll.checked = checkedCount === visibleCheckboxes.length;
    selectAll.indeterminate = checkedCount > 0 && checkedCount < visibleCheckboxes.length;
};

document.addEventListener('click', async (event) => {
    const imageButton = event.target.closest('.image-preview');
    if (imageButton) {
        showImage(imageButton.dataset.src);
        return;
    }
    const detailButton = event.target.closest('.details-btn');
    if (detailButton) {
        try {
            const doc = await localDB.get(detailButton.dataset.id);
            openDetailsModal(doc);
        } catch (error) {
            console.error('Erreur ouverture détail :', error);
            alert('Impossible de charger cette entrée.');
        }
        return;
    }
    const editButton = event.target.closest('.edit-btn');
    if (editButton) {
        try {
            const doc = await localDB.get(editButton.dataset.id);
            setupEditModal(doc);
        } catch (error) {
            console.error('Erreur lors de l\'ouverture de l\'édition :', error);
            alert('Impossible de charger cette entrée.');
        }
    }
});

document.addEventListener('change', async (event) => {
    if (event.target.classList.contains('updateDeliveredStatus')) {
        await updateDeliveredStatus(event.target.dataset.id, event.target.value);
        return;
    }
    if (event.target.classList.contains('selectRow')) {
        if (event.target.checked) {
            selectedDocs.add(event.target.dataset.id);
        } else {
            selectedDocs.delete(event.target.dataset.id);
        }
        updateSelectAllState();
        updateSelectedSummary();
    }
});

document.getElementById('closePopup').addEventListener('click', () => {
    document.getElementById('imagePopup').style.display = 'none';
});

document.getElementById('imagePopup').addEventListener('click', (event) => {
    if (event.target.id === 'imagePopup') {
        document.getElementById('imagePopup').style.display = 'none';
    }
});

document.getElementById('selectAll').addEventListener('change', (event) => {
    document.querySelectorAll('.selectRow').forEach((checkbox) => {
        checkbox.checked = event.target.checked;
        if (event.target.checked) {
            selectedDocs.add(checkbox.dataset.id);
        } else {
            selectedDocs.delete(checkbox.dataset.id);
        }
    });
    updateSelectAllState();
    updateSelectedSummary();
});

document.getElementById('searchBtn').addEventListener('click', applyFilters);
document.getElementById('searchInput').addEventListener('input', () => { currentPage = 1; applyFilters(); });
document.getElementById('dateFilter').addEventListener('change', () => { currentPage = 1; applyFilters(); });
document.getElementById('deliveredFilter').addEventListener('change', () => { currentPage = 1; applyFilters(); });
document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelected);
document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);
document.getElementById('exportBtn').addEventListener('click', exportToExcel);
document.getElementById('exportZipBtn').addEventListener('click', exportToZip);
document.getElementById('sortDeliveryDate').addEventListener('click', () => { sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; loadData(); });

window.addEventListener('DOMContentLoaded', () => {
    updateSelectedSummary();
    loadData();
});
