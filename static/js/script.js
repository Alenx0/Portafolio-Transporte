document.addEventListener('DOMContentLoaded', function() {

    // ===============================================
    // 0. CONFIGURACIÓN GLOBAL
    // ===============================================
    const config = {
        emailJS: {
            publicKey: 'pkNXZfH_TMKfgRS_k',
            serviceID: 'service_zex953s',
            templateID: 'template_h2b0ayq'
        },
        carousel: {
            autoplayDelay: 5000
        }
    };

    // ===============================================
    // 1. LÓGICA DEL MENÚ DE NAVEGACIÓN (HAMBURGUESA)
    // ===============================================
    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.getElementById('main-nav');

    if (navToggle && mainNav) {
        const icon = navToggle.querySelector('i');
        function updateNavIcon() {
            if (mainNav.classList.contains('show')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
        navToggle.addEventListener('click', () => {
            mainNav.classList.toggle('show');
            updateNavIcon();
        });
        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav.classList.contains('show')) {
                    mainNav.classList.remove('show');
                    updateNavIcon();
                }
            });
        });
    }

    // ===============================================
    // 2. LÓGICA DEL CARRUSEL
    // ===============================================
    const carouselContainer = document.querySelector('.carousel-container');
    if (carouselContainer) {
        // ... (La lógica del carrusel sigue exactamente igual)
        const carouselSlides = document.querySelectorAll('.carousel-slide');
        const prevButton = document.querySelector('.carousel-navigation .prev');
        const nextButton = document.querySelector('.carousel-navigation .next');
        const carouselDotsContainer = document.querySelector('.carousel-dots');
        let currentIndex = 0;
        let slideInterval;
        let dots = [];
        function showSlide(index) {
            carouselSlides.forEach(slide => slide.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            if (index >= carouselSlides.length) { currentIndex = 0; } 
            else if (index < 0) { currentIndex = carouselSlides.length - 1; } 
            else { currentIndex = index; }
            carouselSlides[currentIndex].classList.add('active');
            if (dots[currentIndex]) { dots[currentIndex].classList.add('active'); }
        }
        function createDots() {
            carouselSlides.forEach((_, index) => {
                const dot = document.createElement('span');
                dot.classList.add('dot');
                dot.addEventListener('click', () => { showSlide(index); startAutoplay(); });
                carouselDotsContainer.appendChild(dot);
            });
            dots = document.querySelectorAll('.carousel-dots .dot');
        }
        function nextSlide() { showSlide(currentIndex + 1); }
        function startAutoplay() { clearInterval(slideInterval); slideInterval = setInterval(nextSlide, config.carousel.autoplayDelay); }
        if (prevButton) prevButton.addEventListener('click', () => { showSlide(currentIndex - 1); startAutoplay(); });
        if (nextButton) nextButton.addEventListener('click', () => { nextSlide(); startAutoplay(); });
        if(carouselSlides.length > 0) { createDots(); showSlide(currentIndex); startAutoplay(); }
    }

    // ===============================================
    // 3. LÓGICA DE ANIMACIONES "FADE-IN"
    // ===============================================
    const fadeInSections = document.querySelectorAll('.fade-in-section');
    if (fadeInSections.length > 0) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        fadeInSections.forEach(section => { observer.observe(section); });
    }

    // ===============================================
    // 4. LÓGICA DEL FORMULARIO DE CONTACTO (EMAILJS)
    // ===============================================
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        emailjs.init(config.emailJS.publicKey);
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const submitButton = document.getElementById('submit-button');
            const formStatus = document.getElementById('form-status');
            submitButton.disabled = true;
            formStatus.textContent = 'Enviando...';
            formStatus.style.color = '#1e3a8a';
            formStatus.classList.remove('hidden');
            emailjs.sendForm(config.emailJS.serviceID, config.emailJS.templateID, this)
                .then(() => {
                    formStatus.textContent = '¡Mensaje enviado con éxito!';
                    formStatus.style.color = '#28a745';
                    contactForm.reset();
                }, (error) => {
                    formStatus.textContent = 'Error al enviar el mensaje. Por favor, inténtalo de nuevo.';
                    formStatus.style.color = '#dc3545';
                    console.error('ERROR AL ENVIAR EMAIL:', error);
                })
                .finally(() => {
                    submitButton.disabled = false;
                    setTimeout(() => formStatus.classList.add('hidden'), 4000);
                });
        });
    }

    // ===============================================
    // 5. LÓGICA DEL MODAL DE COTIZACIÓN (NUEVO)
    // ===============================================
    const modalOverlay = document.getElementById('quote-modal-overlay');
    const openModalButtons = document.querySelectorAll('.open-quote-modal');
    const closeModalButton = document.getElementById('close-modal-btn');

    if (modalOverlay && openModalButtons.length > 0 && closeModalButton) {
        
        function openModal() {
            modalOverlay.classList.remove('hidden');
            document.body.classList.add('modal-open');
        }

        function closeModal() {
            modalOverlay.classList.add('hidden');
            document.body.classList.remove('modal-open');
        }

        // Abrir el modal con cualquiera de los botones/enlaces
        openModalButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.preventDefault(); // Evita que el enlace recargue la página
                openModal();
            });
        });

        // Cerrar el modal con el botón 'X'
        closeModalButton.addEventListener('click', closeModal);

        // Cerrar el modal al hacer clic en el fondo oscuro (overlay)
        modalOverlay.addEventListener('click', function(event) {
            // Si el clic fue directamente en el overlay y no en sus hijos (el contenido del modal)
            if (event.target === modalOverlay) {
                closeModal();
            }
        });
    }
});
