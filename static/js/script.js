document.addEventListener('DOMContentLoaded', function() {

    // ===============================================
    // 0. CONFIGURACIÓN Y SELECTORES GLOBALES
    // ===============================================
    const config = {
        emailJS: {
            publicKey: 'pkNXZfH_TMKfgRS_k',
            serviceID: 'service_zex953s',
            templateID: 'template_h2b0ayq'
        },
        carousel: {
            autoplayDelay: 15000 
        }
    };

    const globalSpinner = document.getElementById('global-spinner-overlay');

    // ===============================================
    // FUNCIONES PARA CONTROLAR EL SPINNER
    // ===============================================
    function showSpinner() {
        if (globalSpinner) {
            globalSpinner.classList.remove('hidden');
        }
    }

    function hideSpinner() {
        if (globalSpinner) {
            globalSpinner.classList.add('hidden');
        }
    }

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
    // 2. LÓGICA DEL CARRUSEL (CON CARGA PEREZOSA)
    // ===============================================
    const carouselContainer = document.querySelector('.carousel-container');
    if (carouselContainer) {
        const carouselSlides = document.querySelectorAll('.carousel-slide');
        const prevButton = document.querySelector('.carousel-navigation .prev');
        const nextButton = document.querySelector('.carousel-navigation .next');
        const carouselDotsContainer = document.querySelector('.carousel-dots');
        let currentIndex = 0;
        let slideInterval;
        let dots = [];

        function showSlide(index) {
            if (index >= carouselSlides.length) { currentIndex = 0; } 
            else if (index < 0) { currentIndex = carouselSlides.length - 1; } 
            else { currentIndex = index; }

            const nextSlideElement = carouselSlides[currentIndex];

            const imageToLoad = nextSlideElement.getAttribute('data-bg');
            if (imageToLoad) {
                nextSlideElement.style.backgroundImage = imageToLoad;
                nextSlideElement.removeAttribute('data-bg');
            }

            carouselSlides.forEach(slide => slide.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            
            nextSlideElement.classList.add('active');
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
    // 4. LÓGICA DEL FORMULARIO DE CONTACTO
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
            
            showSpinner();

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
                    hideSpinner();
                    setTimeout(() => formStatus.classList.add('hidden'), 4000);
                });
        });
    }

    // ===============================================
    // 5. LÓGICA DEL MODAL DE COTIZACIÓN
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
        openModalButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.preventDefault();
                openModal();
            });
        });
        closeModalButton.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', function(event) {
            if (event.target === modalOverlay) {
                closeModal();
            }
        });
    }

    // ===============================================
    // 6. LÓGICA PARA SERVICIOS INTERACTIVOS
    // ===============================================
    const servicesGrid = document.querySelector('.services-grid');
    if (servicesGrid) {
        servicesGrid.addEventListener('click', function(event) {
            const clickedItem = event.target.closest('.service-item');
            const closeButton = event.target.closest('.close-service');

            if (closeButton) {
                event.stopPropagation();
                const expandedItem = document.querySelector('.service-item.expanded');
                if (expandedItem) {
                    expandedItem.classList.remove('expanded');
                    servicesGrid.classList.remove('expanded');
                }
                return;
            }

            if (clickedItem) {
                const isAlreadyExpanded = clickedItem.classList.contains('expanded');
                
                servicesGrid.querySelectorAll('.service-item').forEach(item => item.classList.remove('expanded'));
                
                if (!isAlreadyExpanded) {
                    clickedItem.classList.add('expanded');
                    servicesGrid.classList.add('expanded');
                    
                    setTimeout(() => {
                        document.getElementById('servicios').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                } else {
                    servicesGrid.classList.remove('expanded');
                }
            }
        });
    }
});
