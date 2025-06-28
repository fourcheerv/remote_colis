
// === Initialisation des bases de données PouchDB ===
const localDB = new PouchDB('receptions');
const remoteDB = new PouchDB('https://apikey-v2-237azo7t1nwttyu787vl2zuxfh5ywxrddnfhcujd2nbu:b7ce3f8c0a99a10c0825a4c1ff68fe62@ca3c9329-df98-4982-a3dd-ba2b294b02ef-bluemix.cloudantnosqldb.appdomain.cloud/receptions');
localDB.sync(remoteDB, { live: true, retry: true }).on('error', console.error);

// === Sélecteurs principaux ===
const cameraInput = document.getElementById("cameraInput");
const galleryInput = document.getElementById("galleryInput");
const previewContainer = document.getElementById("previewContainer");
const canvas = document.getElementById("signaturePad");
const signaturePad = new SignaturePad(canvas, { backgroundColor: '#fff' });
const loadingPopup = document.getElementById("loadingPopup");
const popupProgressBar = document.getElementById("popupProgressBar");

// === Gestion du redimensionnement de la signature ===
function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    signaturePad.clear();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// === Gestion des photos ===
let imageFiles = [];

function updatePhotoCount() {
    document.getElementById("photoCount").textContent = imageFiles.length;
}

function compresserImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 800;
            canvas.height = (img.height / img.width) * 800;
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(callback, "image/jpeg", 0.7);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleFiles(fileList) {
    const files = Array.from(fileList);
    if (imageFiles.length + files.length > 3) {
        alert("Vous ne pouvez ajouter que 3 photos au maximum.");
        return;
    }

    files.forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        compresserImage(file, (compressedBlob) => {
            imageFiles.push(compressedBlob);
            const reader = new FileReader();
            reader.onload = (e) => {
                const wrapper = document.createElement("div");
                wrapper.className = "preview-image";

                const img = document.createElement("img");
                img.src = e.target.result;

                const removeBtn = document.createElement("button");
                removeBtn.className = "remove-button";
                removeBtn.textContent = "x";

                removeBtn.addEventListener("click", () => {
                    const index = Array.from(previewContainer.children).indexOf(wrapper);
                    if (index !== -1) {
                        imageFiles.splice(index, 1);
                        wrapper.remove();
                        updatePhotoCount();
                    }
                });

                wrapper.appendChild(img);
                wrapper.appendChild(removeBtn);
                previewContainer.appendChild(wrapper);
                updatePhotoCount();
            };
            reader.readAsDataURL(compressedBlob);
        });
    });
}

cameraInput.addEventListener("change", (e) => handleFiles(e.target.files));
galleryInput.addEventListener("change", (e) => handleFiles(e.target.files));

document.getElementById("takePhotoBtn").addEventListener("click", () => cameraInput.click());
document.getElementById("chooseGalleryBtn").addEventListener("click", () => galleryInput.click());
document.getElementById("clearSignature").addEventListener("click", () => signaturePad.clear());
document.getElementById("clearForm").addEventListener("click", () => {
    document.getElementById("packageForm").reset();
    previewContainer.innerHTML = "";
    imageFiles = [];
    signaturePad.clear();
    updatePhotoCount();
});

// === Traitement du formulaire principal ===
document.getElementById("packageForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const deliveredRadio = document.querySelector('input[name="delivered"]:checked');
    if (!deliveredRadio) return alert("Veuillez sélectionner si le(les) colis a(ont) été livré(s) !");

    const deliveredValue = deliveredRadio.value;
    const serviceEmail = document.getElementById("serviceEmails").value.trim();
    const recipientName = formData.get("recipientName").trim();
    const receiverName = formData.get("receiverName").trim();
    const packageCount = formData.get("packageCount").trim();
    const deliveryDate = new Date(formData.get("deliveryDate"));
    const formattedDeliveryDate = deliveryDate.toLocaleString('fr-FR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });

    if (
        !recipientName ||
        !receiverName ||
        !packageCount ||
        (!serviceEmail && deliveredValue === "false")
    ) {
        return alert("Veuillez remplir tous les champs obligatoires !");
    }


    if (imageFiles.length === 0) return alert("Veuillez ajouter au moins une photo !");
    if (signaturePad.isEmpty()) return alert("Veuillez signer avant de sauvegarder.");

    const data = {
        _id: new Date().toISOString(),
        recipientName,
        receiverName,
        packageCount,
        serviceEmail,
        deliveryDate: formattedDeliveryDate,
        delivered: deliveredRadio.value,
        signature: signaturePad.toDataURL("image/jpeg"),
        photos: [],
    };

    for (const file of imageFiles) {
        const dataURL = await new Promise((res) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.readAsDataURL(file);
        });
        data.photos.push(dataURL);
    }

    try {
        await localDB.put(data);
        if (deliveredRadio.value === "false") {
            sendEmailColisNon(serviceEmail, recipientName, packageCount, receiverName);
        } else {
            alert("Données sauvegardées avec succès !");
        }
        document.getElementById("clearForm").click();
    } catch (err) {
        console.error("Erreur de sauvegarde :", err);
        alert("Erreur lors de l'enregistrement.");
    }
});

// === Envoi de l’email si colis non livré ===
function sendEmailColisNon(serviceEmail, recipientName, packageCount, receiverName) {
    loadingPopup.classList.remove("hidden");
    loadingPopup.classList.add("visible");
    popupProgressBar.style.width = "0%";
    let progress = 0;

    const interval = setInterval(() => {
        progress += 10;
        if (progress <= 90) {
            popupProgressBar.style.width = `${progress}%`;
        }
    }, 200);

    emailjs.init("UFlNoLfp7PdWyrBak");

    emailjs.send("service_colis", "template_colis_non", {
        serviceEmail,
        recipientName,
        packageCount,
        receiverName,
        message: "Le(les) colis n'a(ont) pas pu être livré(s). Merci de contacter le service manutention pour le(les) récupérer.",
    })
    .then(() => {
        clearInterval(interval);
        popupProgressBar.style.width = "100%";
        alert("Email envoyé avec succès !");
    })
    .catch((error) => {
        clearInterval(interval);
        alert(`Erreur lors de l'envoi de l'email : ${error.text || error.message || 'Erreur inconnue'}`);
    })
    .finally(() => {
        setTimeout(() => {
            loadingPopup.classList.remove("visible");
            loadingPopup.classList.add("hidden");
        }, 1000);
    });
}
