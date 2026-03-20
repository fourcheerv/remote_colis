const COUCHDB_URL = 'https://apikey-v2-237azo7t1nwttyu787vl2zuxfh5ywxrddnfhcujd2nbu:b7ce3f8c0a99a10c0825a4c1ff68fe62@ca3c9329-df98-4982-a3dd-ba2b294b02ef-bluemix.cloudantnosqldb.appdomain.cloud/receptions';
const localDB = new PouchDB('receptions');
const remoteDB = new PouchDB(COUCHDB_URL);

const cameraInput = document.getElementById('cameraInput');
const galleryInput = document.getElementById('galleryInput');
const previewContainer = document.getElementById('previewContainer');
const canvas = document.getElementById('signaturePad');
const signaturePad = new SignaturePad(canvas, { backgroundColor: '#fff' });
const loadingPopup = document.getElementById('loadingPopup');
const popupProgressBar = document.getElementById('popupProgressBar');
const form = document.getElementById('packageForm');
const deliveryDateInput = document.getElementById('deliveryDate');
const submitStatus = document.getElementById('submitStatus');
const submitStatusText = document.getElementById('submitStatusText');

let imageFiles = [];
let syncHandler = null;

const setSubmitStatus = (state, message, persistent = true) => {
    if (!submitStatus || !submitStatusText) return;

    submitStatus.classList.remove('hidden', 'is-pending', 'is-syncing', 'is-ok', 'is-warning', 'is-error');
    submitStatus.classList.add(state);
    submitStatusText.textContent = message;

    if (!persistent) {
        window.setTimeout(() => {
            hideSubmitStatus();
        }, 5000);
    }
};

const hideSubmitStatus = () => {
    if (!submitStatus || !submitStatusText) return;
    submitStatus.classList.add('hidden');
    submitStatus.classList.remove('is-pending', 'is-syncing', 'is-ok', 'is-warning', 'is-error');
    submitStatusText.textContent = '';
};

const setDefaultDeliveryDate = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    deliveryDateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
};

const resizeCanvas = () => {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    signaturePad.clear();
};

const updatePhotoCount = () => {
    document.getElementById('photoCount').textContent = imageFiles.length;
};

const compresserImage = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const image = new Image();
        image.onload = () => {
            const dynamicCanvas = document.createElement('canvas');
            dynamicCanvas.width = 800;
            dynamicCanvas.height = (image.height / image.width) * 800;
            dynamicCanvas.getContext('2d').drawImage(image, 0, 0, dynamicCanvas.width, dynamicCanvas.height);
            dynamicCanvas.toBlob(callback, 'image/jpeg', 0.7);
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

const renderPreview = (dataUrl, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-image';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = `Photo ${index + 1}`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-button';
    removeBtn.textContent = 'x';
    removeBtn.addEventListener('click', () => {
        imageFiles.splice(index, 1);
        rerenderPreviews();
    });

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    previewContainer.appendChild(wrapper);
};

const rerenderPreviews = async () => {
    previewContainer.innerHTML = '';
    const urls = await Promise.all(imageFiles.map((file) => blobToDataUrl(file)));
    urls.forEach((url, index) => renderPreview(url, index));
    updatePhotoCount();
};

const handleFiles = (fileList) => {
    const files = Array.from(fileList);
    if (imageFiles.length + files.length > 3) {
        alert('Vous ne pouvez ajouter que 3 photos au maximum.');
        return;
    }

    files.forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        compresserImage(file, async (compressedBlob) => {
            imageFiles.push(compressedBlob);
            await rerenderPreviews();
        });
    });
};

const resetFormState = () => {
    form.reset();
    previewContainer.innerHTML = '';
    imageFiles = [];
    signaturePad.clear();
    updatePhotoCount();
    setDefaultDeliveryDate();
};

const formatDeliveryDate = (rawValue) => {
    const date = new Date(rawValue);
    return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const validateForm = (payload) => {
    if (!payload.recipientName.trim()) {
        return 'Veuillez renseigner le nom du destinataire.';
    }

    if (!payload.receiverName.trim()) {
        return 'Veuillez renseigner le nom du réceptionnaire.';
    }

    if (!Number.isFinite(payload.packageCount) || payload.packageCount <= 0) {
        return 'Le nombre de colis doit être supérieur à 0.';
    }

    if (!payload.deliveryDateRaw) {
        return 'Veuillez renseigner la date et heure de réception.';
    }

    const deliveryDate = new Date(payload.deliveryDateRaw);
    if (Number.isNaN(deliveryDate.getTime())) {
        return 'La date de réception est invalide.';
    }

    if (deliveryDate.getTime() > Date.now() + 5 * 60 * 1000) {
        return 'La date de réception ne peut pas être dans le futur.';
    }

    if (!payload.delivered) {
        return 'Veuillez indiquer si le colis a été livré.';
    }

    if (payload.delivered === 'false' && !payload.serviceEmail) {
        return 'Veuillez sélectionner un email référent pour un colis non livré.';
    }

    if (imageFiles.length === 0) {
        return 'Veuillez ajouter au moins une photo.';
    }

    if (signaturePad.isEmpty()) {
        return 'Veuillez signer avant de sauvegarder.';
    }

    return null;
};

const confirmRemoteSync = async (docId) => {
    const attempts = 8;
    for (let index = 0; index < attempts; index += 1) {
        try {
            const remoteDoc = await remoteDB.get(docId);
            if (remoteDoc && remoteDoc._id === docId) {
                setSubmitStatus('is-ok', 'Enregistrement sauvegardé et synchronisé avec la base distante.', false);
                return;
            }
        } catch (error) {
            if (!error || error.status !== 404) {
                console.warn('Vérification distante impossible :', error);
                break;
            }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 800));
    }

    setSubmitStatus('is-warning', 'Enregistrement local réussi, mais la confirmation de synchronisation prend plus de temps que prévu.');
};

const sendEmailColisNon = (serviceEmail, recipientName, packageCount, receiverName) => {
    loadingPopup.classList.remove('hidden');
    loadingPopup.classList.add('visible');
    popupProgressBar.style.width = '0%';
    let progress = 0;

    const interval = setInterval(() => {
        progress += 10;
        if (progress <= 90) {
            popupProgressBar.style.width = `${progress}%`;
        }
    }, 200);

    emailjs.init('UFlNoLfp7PdWyrBak');

    return emailjs.send('service_colis', 'template_colis_non', {
        serviceEmail,
        recipientName,
        packageCount,
        receiverName,
        message: "Le(les) colis n'a(ont) pas pu être livré(s). Merci de contacter le service manutention pour le(les) récupérer."
    }).then(() => {
        clearInterval(interval);
        popupProgressBar.style.width = '100%';
    }).catch((error) => {
        clearInterval(interval);
        throw error;
    }).finally(() => {
        window.setTimeout(() => {
            loadingPopup.classList.remove('visible');
            loadingPopup.classList.add('hidden');
        }, 1000);
    });
};

const startSync = () => {
    if (syncHandler) return;

    syncHandler = localDB.sync(remoteDB, { live: true, retry: true })
        .on('active', () => {
            setSubmitStatus('is-syncing', 'Synchronisation avec la base distante en cours...');
        })
        .on('paused', (error) => {
            if (error) {
                setSubmitStatus('is-warning', 'Synchronisation en pause. Nouvelle tentative automatique...');
                return;
            }

            const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
            if (isOffline) {
                setSubmitStatus('is-warning', 'Mode hors ligne. Les nouveaux enregistrements seront synchronisés plus tard.');
                return;
            }

            if (submitStatusText && !submitStatus.classList.contains('hidden')) {
                setSubmitStatus('is-ok', submitStatusText.textContent || 'Toutes les données sont synchronisées avec la base distante.');
            }
        })
        .on('error', (error) => {
            console.error('Erreur de synchronisation :', error);
            const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
            setSubmitStatus(
                isOffline ? 'is-warning' : 'is-error',
                isOffline
                    ? 'Connexion internet indisponible. Synchronisation en attente.'
                    : 'Erreur de synchronisation avec la base distante.'
            );
        });
};

cameraInput.addEventListener('change', (event) => handleFiles(event.target.files));
galleryInput.addEventListener('change', (event) => handleFiles(event.target.files));
document.getElementById('takePhotoBtn').addEventListener('click', () => cameraInput.click());
document.getElementById('chooseGalleryBtn').addEventListener('click', () => galleryInput.click());
document.getElementById('clearSignature').addEventListener('click', () => signaturePad.clear());
document.getElementById('clearForm').addEventListener('click', resetFormState);

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const deliveredRadio = document.querySelector('input[name="delivered"]:checked');
    const payload = {
        recipientName: document.getElementById('recipientName').value.trim(),
        receiverName: document.getElementById('receiverName').value.trim(),
        packageCount: Number(document.getElementById('packageCount').value),
        serviceEmail: document.getElementById('serviceEmails').value.trim(),
        deliveryDateRaw: deliveryDateInput.value,
        delivered: deliveredRadio ? deliveredRadio.value : ''
    };

    const validationError = validateForm(payload);
    if (validationError) {
        setSubmitStatus('is-error', validationError);
        return;
    }

    const data = {
        _id: new Date().toISOString(),
        recipientName: payload.recipientName,
        receiverName: payload.receiverName,
        packageCount: payload.packageCount,
        serviceEmail: payload.serviceEmail,
        deliveryDate: formatDeliveryDate(payload.deliveryDateRaw),
        delivered: payload.delivered,
        signature: signaturePad.toDataURL('image/jpeg'),
        photos: []
    };

    for (const file of imageFiles) {
        const dataURL = await blobToDataUrl(file);
        data.photos.push(dataURL);
    }

    try {
        setSubmitStatus('is-pending', 'Enregistrement local en cours...');
        await localDB.put(data);
        setSubmitStatus('is-syncing', 'Enregistrement local réussi. Vérification de la synchronisation distante...');

        if (payload.delivered === 'false') {
            try {
                await sendEmailColisNon(payload.serviceEmail, payload.recipientName, payload.packageCount, payload.receiverName);
            } catch (error) {
                console.error('Erreur lors de l\'envoi de l\'email :', error);
                setSubmitStatus('is-warning', `Enregistrement effectué, mais l'email n'a pas pu être envoyé : ${error.text || error.message || 'Erreur inconnue'}`);
            }
        }

        await confirmRemoteSync(data._id);
        resetFormState();
    } catch (error) {
        console.error('Erreur de sauvegarde :', error);
        setSubmitStatus('is-error', 'Erreur lors de l\'enregistrement du colis.');
    }
});

window.addEventListener('online', () => {
    setSubmitStatus('is-pending', 'Connexion rétablie. Synchronisation en reprise...');
});

window.addEventListener('offline', () => {
    setSubmitStatus('is-warning', 'Mode hors ligne. Les nouveaux enregistrements seront synchronisés plus tard.');
});

window.addEventListener('resize', resizeCanvas);
window.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    resetFormState();
    startSync();
    setSubmitStatus('is-ok', 'Formulaire prêt. Toutes les données sont synchronisées.', false);
});
