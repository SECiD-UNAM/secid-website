/**
 * SECiD Components JavaScript
 * Interactive functionality for the custom component system
 */

class SECiDComponents {
    constructor() {
        this.init();
    }

    init() {
        this.initTheme();
        this.initNavbar();
        this.initButtons();
        this.initForms();
        this.initCards();
        this.initToasts();
        this.initModals();
        this.initAnimations();
        this.initSwipeGestures();
    }

    // ========== THEME FUNCTIONALITY ==========
    initTheme() {
        const themeToggles = document.querySelectorAll('.secid-navbar__theme-toggle');
        const currentTheme = localStorage.getItem('secid-theme') || 'light';
        
        // Set initial theme
        document.documentElement.setAttribute('data-theme', currentTheme);
        
        themeToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('secid-theme', theme);
                
                // Smooth transition
                document.documentElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
            });
        });
    }

    // ========== NAVBAR FUNCTIONALITY ==========
    initNavbar() {
        const navbar = document.querySelector('.secid-navbar');
        if (!navbar) return;

        // Scroll effect
        let lastScrollY = window.scrollY;
        const scrollThreshold = 50;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > scrollThreshold) {
                navbar.classList.add('secid-navbar--scrolled');
            } else {
                navbar.classList.remove('secid-navbar--scrolled');
            }

            // Hide/show navbar on scroll
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }

            lastScrollY = currentScrollY;
        });

        // Mobile menu toggle (for tablets)
        const mobileToggle = navbar.querySelector('.secid-navbar__mobile-toggle');
        const mobileMenu = navbar.querySelector('.secid-navbar__mobile-menu');
        
        if (mobileToggle && mobileMenu) {
            mobileToggle.addEventListener('click', () => {
                const isOpen = mobileMenu.classList.contains('secid-navbar__mobile-menu--open');
                
                mobileMenu.classList.toggle('secid-navbar__mobile-menu--open');
                mobileToggle.classList.toggle('secid-navbar__mobile-toggle--open');
                
                // Update ARIA attributes
                mobileToggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
                mobileMenu.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
                
                // Update aria-label
                const lang = document.documentElement.lang || 'es';
                const openLabel = lang === 'es' ? 'Abrir menú de navegación' : 'Open navigation menu';
                const closeLabel = lang === 'es' ? 'Cerrar menú de navegación' : 'Close navigation menu';
                mobileToggle.setAttribute('aria-label', isOpen ? openLabel : closeLabel);
                
                // Prevent body scroll when menu is open
                document.body.style.overflow = !isOpen ? 'hidden' : '';
                
                // Focus management
                if (!isOpen) {
                    // Menu is being opened - focus first menu item
                    const firstMenuItem = mobileMenu.querySelector('a');
                    if (firstMenuItem) {
                        setTimeout(() => firstMenuItem.focus(), 100);
                    }
                }
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!navbar.contains(e.target)) {
                    this.closeMobileMenu(mobileToggle, mobileMenu);
                }
            });

            // Close menu with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && mobileMenu.classList.contains('secid-navbar__mobile-menu--open')) {
                    this.closeMobileMenu(mobileToggle, mobileMenu);
                    mobileToggle.focus();
                }
            });
        }

        // Language selector accessibility
        this.initLanguageSelector(navbar);

        // Bottom navigation functionality
        this.initBottomNav();

        // Active link highlighting
        const navLinks = navbar.querySelectorAll('.secid-navbar__link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                navLinks.forEach(l => l.classList.remove('secid-navbar__link--active'));
                link.classList.add('secid-navbar__link--active');
            });
        });
    }

    closeMobileMenu(mobileToggle, mobileMenu) {
        mobileMenu.classList.remove('secid-navbar__mobile-menu--open');
        mobileToggle.classList.remove('secid-navbar__mobile-toggle--open');
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        
        // Update aria-label
        const lang = document.documentElement.lang || 'es';
        const openLabel = lang === 'es' ? 'Abrir menú de navegación' : 'Open navigation menu';
        mobileToggle.setAttribute('aria-label', openLabel);
    }

    initLanguageSelector(navbar) {
        const langButton = navbar.querySelector('.secid-navbar__lang-btn');
        const langDropdown = navbar.querySelector('.secid-navbar__lang-dropdown');
        
        if (langButton && langDropdown) {
            langButton.addEventListener('click', () => {
                const isExpanded = langButton.getAttribute('aria-expanded') === 'true';
                langButton.setAttribute('aria-expanded', !isExpanded);
                langDropdown.style.display = !isExpanded ? 'block' : 'none';
                
                if (!isExpanded) {
                    const firstOption = langDropdown.querySelector('a');
                    if (firstOption) {
                        setTimeout(() => firstOption.focus(), 100);
                    }
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!langButton.contains(e.target) && !langDropdown.contains(e.target)) {
                    langButton.setAttribute('aria-expanded', 'false');
                    langDropdown.style.display = 'none';
                }
            });

            // Close dropdown with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && langButton.getAttribute('aria-expanded') === 'true') {
                    langButton.setAttribute('aria-expanded', 'false');
                    langDropdown.style.display = 'none';
                    langButton.focus();
                }
            });
        }
    }

    // ========== BOTTOM NAVIGATION FUNCTIONALITY ==========
    initBottomNav() {
        const bottomNav = document.querySelector('.secid-bottom-nav');
        if (!bottomNav) return;

        // More button functionality
        const moreButton = bottomNav.querySelector('[data-bottom-nav-more]');
        if (moreButton) {
            moreButton.addEventListener('click', () => {
                this.showBottomNavMoreMenu();
            });
        }

        // Active state management
        const bottomNavItems = bottomNav.querySelectorAll('.secid-bottom-nav__item');
        bottomNavItems.forEach(item => {
            if (!item.hasAttribute('data-bottom-nav-more')) {
                item.addEventListener('click', () => {
                    // Remove active class from all items
                    bottomNavItems.forEach(i => i.classList.remove('secid-bottom-nav__item--active'));
                    // Add active class to clicked item
                    item.classList.add('secid-bottom-nav__item--active');
                });
            }
        });

        // Handle scroll to show/hide bottom nav on mobile
        let lastScrollY = window.scrollY;
        let isScrolling = false;

        window.addEventListener('scroll', () => {
            if (!isScrolling) {
                requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;
                    const scrollDifference = Math.abs(currentScrollY - lastScrollY);
                    
                    // Only trigger on significant scroll
                    if (scrollDifference > 10) {
                        if (currentScrollY > lastScrollY && currentScrollY > 100) {
                            // Scrolling down - hide bottom nav
                            bottomNav.style.transform = 'translateY(100%)';
                        } else {
                            // Scrolling up - show bottom nav
                            bottomNav.style.transform = 'translateY(0)';
                        }
                    }
                    
                    lastScrollY = currentScrollY;
                    isScrolling = false;
                });
                isScrolling = true;
            }
        });
    }

    showBottomNavMoreMenu() {
        // Create modal or bottom sheet for additional options
        const moreMenuOptions = [
            { 
                label: document.documentElement.lang === 'es' ? 'Nosotros' : 'About Us',
                href: `/${document.documentElement.lang}/${document.documentElement.lang === 'es' ? 'sobre-nosotros' : 'about-us'}`,
                icon: 'fas fa-info-circle'
            },
            {
                label: document.documentElement.lang === 'es' ? 'Iniciar Sesión' : 'Login',
                href: '#',
                icon: 'fas fa-sign-in-alt'
            },
            {
                label: document.documentElement.lang === 'es' ? 'Registrarse' : 'Register',
                href: `/${document.documentElement.lang}/signup`,
                icon: 'fas fa-user-plus'
            },
            {
                label: document.documentElement.lang === 'es' ? 'Configuración' : 'Settings',
                href: '#',
                icon: 'fas fa-cog'
            }
        ];

        this.showBottomSheet(moreMenuOptions);
    }

    showBottomSheet(options) {
        // Remove existing bottom sheet if any
        const existingSheet = document.querySelector('.secid-bottom-sheet');
        if (existingSheet) {
            existingSheet.remove();
        }

        // Create bottom sheet
        const bottomSheet = document.createElement('div');
        bottomSheet.className = 'secid-bottom-sheet';
        bottomSheet.innerHTML = `
            <div class="secid-bottom-sheet__backdrop"></div>
            <div class="secid-bottom-sheet__content">
                <div class="secid-bottom-sheet__header">
                    <div class="secid-bottom-sheet__handle"></div>
                </div>
                <div class="secid-bottom-sheet__body">
                    ${options.map(option => `
                        <a href="${option.href}" class="secid-bottom-sheet__item">
                            <i class="${option.icon}"></i>
                            <span>${option.label}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(bottomSheet);

        // Add styles if not already present
        if (!document.querySelector('#secid-bottom-sheet-styles')) {
            const styles = document.createElement('style');
            styles.id = 'secid-bottom-sheet-styles';
            styles.textContent = `
                .secid-bottom-sheet {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: var(--z-modal);
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }
                .secid-bottom-sheet.show {
                    opacity: 1;
                    visibility: visible;
                }
                .secid-bottom-sheet__backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    cursor: pointer;
                }
                .secid-bottom-sheet__content {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: var(--color-surface);
                    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
                    transform: translateY(100%);
                    transition: transform 0.3s ease;
                    max-height: 60vh;
                    overflow: hidden;
                }
                .secid-bottom-sheet.show .secid-bottom-sheet__content {
                    transform: translateY(0);
                }
                .secid-bottom-sheet__header {
                    padding: var(--space-md);
                    text-align: center;
                }
                .secid-bottom-sheet__handle {
                    width: 2rem;
                    height: 0.25rem;
                    background: var(--color-border);
                    border-radius: var(--radius-full);
                    margin: 0 auto;
                }
                .secid-bottom-sheet__body {
                    padding: 0 var(--space-lg) var(--space-xl);
                }
                .secid-bottom-sheet__item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    padding: var(--space-lg);
                    text-decoration: none;
                    color: var(--color-text-primary);
                    border-radius: var(--radius-lg);
                    transition: all var(--transition-fast);
                    min-height: 3rem;
                }
                .secid-bottom-sheet__item:hover {
                    background: var(--color-surface-alt);
                    color: var(--secid-primary);
                }
                .secid-bottom-sheet__item i {
                    font-size: 1.25rem;
                    width: 1.5rem;
                    text-align: center;
                }
            `;
            document.head.appendChild(styles);
        }

        // Show the bottom sheet
        setTimeout(() => {
            bottomSheet.classList.add('show');
        }, 10);

        // Handle backdrop click
        const backdrop = bottomSheet.querySelector('.secid-bottom-sheet__backdrop');
        backdrop.addEventListener('click', () => {
            this.hideBottomSheet(bottomSheet);
        });

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.hideBottomSheet(bottomSheet);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    hideBottomSheet(bottomSheet) {
        bottomSheet.classList.remove('show');
        setTimeout(() => {
            if (bottomSheet.parentNode) {
                bottomSheet.remove();
            }
        }, 300);
    }

    // ========== BUTTON FUNCTIONALITY ==========
    initButtons() {
        // Loading state functionality
        const buttons = document.querySelectorAll('.secid-button');
        
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                if (button.classList.contains('secid-button--loading')) {
                    e.preventDefault();
                    return;
                }

                // Add ripple effect
                this.createRipple(e, button);
            });
        });
    }

    createRipple(event, button) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: secid-ripple 0.6s linear;
            pointer-events: none;
        `;

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    setButtonLoading(button, loading = true) {
        if (loading) {
            button.classList.add('secid-button--loading');
            button.disabled = true;
        } else {
            button.classList.remove('secid-button--loading');
            button.disabled = false;
        }
    }

    // ========== FORM FUNCTIONALITY ==========
    initForms() {
        const forms = document.querySelectorAll('.secid-form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('.secid-form__input, .secid-form__textarea, .secid-form__select');
            
            inputs.forEach(input => {
                // Real-time validation
                input.addEventListener('input', () => this.validateInput(input));
                input.addEventListener('blur', () => this.validateInput(input));
                
                // Focus/blur effects
                input.addEventListener('focus', () => {
                    input.parentElement.classList.add('secid-form__group--focused');
                });
                
                input.addEventListener('blur', () => {
                    input.parentElement.classList.remove('secid-form__group--focused');
                });
            });

            // Form submission
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(form);
            });
        });
    }

    validateInput(input) {
        const value = input.value.trim();
        const isRequired = input.hasAttribute('required');
        const isValid = input.checkValidity();
        
        // Remove existing validation classes
        input.classList.remove('secid-form__input--error', 'secid-form__input--success');
        
        // Remove existing messages
        const existingMessage = input.parentElement.querySelector('.secid-form__error, .secid-form__success');
        if (existingMessage) {
            existingMessage.remove();
        }

        if (value === '' && isRequired) {
            this.showInputError(input, 'Este campo es requerido');
        } else if (value !== '' && !isValid) {
            this.showInputError(input, this.getValidationMessage(input));
        } else if (value !== '' && isValid) {
            this.showInputSuccess(input);
        }
    }

    showInputError(input, message) {
        input.classList.add('secid-form__input--error');
        
        const errorElement = document.createElement('div');
        errorElement.className = 'secid-form__error';
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        input.parentElement.appendChild(errorElement);
    }

    showInputSuccess(input) {
        input.classList.add('secid-form__input--success');
        
        const successElement = document.createElement('div');
        successElement.className = 'secid-form__success';
        successElement.innerHTML = '<i class="fas fa-check-circle"></i> Válido';
        
        input.parentElement.appendChild(successElement);
    }

    getValidationMessage(input) {
        const validity = input.validity;
        
        if (validity.valueMissing) return 'Este campo es requerido';
        if (validity.typeMismatch) return 'Formato inválido';
        if (validity.tooShort) return `Mínimo ${input.minLength} caracteres`;
        if (validity.tooLong) return `Máximo ${input.maxLength} caracteres`;
        if (validity.patternMismatch) return 'Formato inválido';
        
        return 'Valor inválido';
    }

    async handleFormSubmit(form) {
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Validate all inputs
        const inputs = form.querySelectorAll('.secid-form__input, .secid-form__textarea, .secid-form__select');
        let isValid = true;
        
        inputs.forEach(input => {
            this.validateInput(input);
            if (!input.checkValidity()) {
                isValid = false;
            }
        });

        if (!isValid) {
            this.showToast('Por favor corrige los errores en el formulario', 'error');
            return;
        }

        // Show loading state
        if (submitButton) {
            this.setButtonLoading(submitButton, true);
        }

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showToast('Formulario enviado exitosamente', 'success');
            form.reset();
            
            // Remove validation classes
            inputs.forEach(input => {
                input.classList.remove('secid-form__input--error', 'secid-form__input--success');
                const message = input.parentElement.querySelector('.secid-form__error, .secid-form__success');
                if (message) message.remove();
            });
            
        } catch (error) {
            this.showToast('Error al enviar el formulario', 'error');
        } finally {
            if (submitButton) {
                this.setButtonLoading(submitButton, false);
            }
        }
    }

    // ========== CARD FUNCTIONALITY ==========
    initCards() {
        // Job cards
        const jobCards = document.querySelectorAll('.secid-job-card');
        jobCards.forEach(card => {
            card.addEventListener('click', () => {
                // Add click animation
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 150);
            });
        });

        // Feature cards
        const featureCards = document.querySelectorAll('.secid-feature-card');
        featureCards.forEach(card => {
            this.addHoverTilt(card);
        });

        // Member cards
        const memberCards = document.querySelectorAll('.secid-member-card');
        memberCards.forEach(card => {
            this.addHoverTilt(card);
        });
    }

    addHoverTilt(element) {
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'perspective(1000px) rotateX(5deg) rotateY(-5deg) translateY(-8px)';
        });

        element.addEventListener('mouseleave', () => {
            element.style.transform = '';
        });
    }

    // ========== TOAST NOTIFICATIONS ==========
    initToasts() {
        // Create toast container if it doesn't exist
        if (!document.querySelector('.secid-toast-container')) {
            const container = document.createElement('div');
            container.className = 'secid-toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: var(--z-toast, 1080);
                display: flex;
                flex-direction: column;
                gap: var(--space-sm, 0.5rem);
            `;
            document.body.appendChild(container);
        }
    }

    showToast(message, type = 'info', duration = 5000) {
        const container = document.querySelector('.secid-toast-container');
        const toast = document.createElement('div');
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const colors = {
            success: '#22C55E',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };

        toast.className = `secid-toast secid-toast--${type}`;
        toast.style.cssText = `
            background: ${colors[type] || colors.info};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-lg, 0.75rem);
            box-shadow: var(--shadow-lg);
            display: flex;
            align-items: center;
            gap: var(--space-sm, 0.5rem);
            min-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-weight: 500;
        `;

        toast.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                margin-left: auto;
                font-size: 1.2rem;
                opacity: 0.7;
                transition: opacity 0.2s;
            " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    // ========== MODAL FUNCTIONALITY ==========
    initModals() {
        const modalTriggers = document.querySelectorAll('[data-modal-target]');
        const modalCloses = document.querySelectorAll('[data-modal-close]');
        
        modalTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = trigger.getAttribute('data-modal-target');
                this.openModal(modalId);
            });
        });

        modalCloses.forEach(close => {
            close.addEventListener('click', () => {
                this.closeModal(close.closest('.secid-modal'));
            });
        });

        // Close modal on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('secid-modal')) {
                this.closeModal(e.target);
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.secid-modal.secid-modal--open');
                if (openModal) {
                    this.closeModal(openModal);
                }
            }
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('secid-modal--open');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.remove('secid-modal--open');
            document.body.style.overflow = '';
        }
    }

    // ========== ANIMATIONS ==========
    initAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('secid-animate-in');
                }
            });
        }, observerOptions);

        // Observe elements that should animate on scroll
        const animateElements = document.querySelectorAll(`
            .secid-feature-card,
            .secid-job-card,
            .secid-member-card,
            .secid-hero__content,
            .secid-hero__visual
        `);

        animateElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });

        // Staggered animation for card grids
        const cardGrids = document.querySelectorAll('.secid-grid');
        cardGrids.forEach(grid => {
            const cards = grid.children;
            Array.from(cards).forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
            });
        });
    }

    // ========== SWIPE GESTURES ==========
    initSwipeGestures() {
        // Add swipe gesture support for mobile browsing
        this.addSwipeSupport();
    }

    addSwipeSupport() {
        // Elements that support swipe gestures
        const swipeableElements = document.querySelectorAll('[data-swipeable]');
        
        swipeableElements.forEach(element => {
            this.makeSwipeable(element);
        });

        // Add swipe support to job cards
        const jobCards = document.querySelectorAll('.secid-job-card');
        jobCards.forEach(card => {
            this.makeSwipeable(card, {
                onSwipeLeft: () => this.handleJobCardSwipeLeft(card),
                onSwipeRight: () => this.handleJobCardSwipeRight(card),
                threshold: 100 // Minimum distance for swipe
            });
        });

        // Add swipe support to member cards
        const memberCards = document.querySelectorAll('.secid-member-card');
        memberCards.forEach(card => {
            this.makeSwipeable(card, {
                onSwipeLeft: () => this.handleMemberCardSwipeLeft(card),
                onSwipeRight: () => this.handleMemberCardSwipeRight(card),
                threshold: 100
            });
        });

        // Add swipe navigation for carousel-like components
        const carousels = document.querySelectorAll('[data-carousel]');
        carousels.forEach(carousel => {
            this.addCarouselSwipe(carousel);
        });
    }

    makeSwipeable(element, options = {}) {
        const config = {
            threshold: options.threshold || 50,
            restraint: options.restraint || 100,
            allowedTime: options.allowedTime || 300,
            onSwipeLeft: options.onSwipeLeft || null,
            onSwipeRight: options.onSwipeRight || null,
            onSwipeUp: options.onSwipeUp || null,
            onSwipeDown: options.onSwipeDown || null
        };

        let startX, startY, startTime;
        let isPointerDown = false;

        // Touch events
        element.addEventListener('touchstart', handleStart, { passive: true });
        element.addEventListener('touchmove', handleMove, { passive: false });
        element.addEventListener('touchend', handleEnd, { passive: true });

        // Mouse events for desktop testing
        element.addEventListener('mousedown', handleStart);
        element.addEventListener('mousemove', handleMove);
        element.addEventListener('mouseup', handleEnd);
        element.addEventListener('mouseleave', handleEnd);

        function handleStart(e) {
            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            startY = touch.clientY;
            startTime = new Date().getTime();
            isPointerDown = true;
            
            // Add visual feedback
            element.style.transition = 'none';
        }

        function handleMove(e) {
            if (!isPointerDown) return;
            
            // Prevent scrolling during horizontal swipes
            const touch = e.touches ? e.touches[0] : e;
            const deltaX = Math.abs(touch.clientX - startX);
            const deltaY = Math.abs(touch.clientY - startY);
            
            if (deltaX > deltaY && deltaX > 10) {
                e.preventDefault();
            }
        }

        function handleEnd(e) {
            if (!isPointerDown) return;
            isPointerDown = false;

            const touch = e.changedTouches ? e.changedTouches[0] : e;
            const distX = touch.clientX - startX;
            const distY = touch.clientY - startY;
            const elapsedTime = new Date().getTime() - startTime;

            // Restore transition
            element.style.transition = '';

            // Check if it's a valid swipe
            if (elapsedTime <= config.allowedTime) {
                if (Math.abs(distX) >= config.threshold && Math.abs(distY) <= config.restraint) {
                    // Horizontal swipe
                    if (distX > 0 && config.onSwipeRight) {
                        config.onSwipeRight(element, distX);
                    } else if (distX < 0 && config.onSwipeLeft) {
                        config.onSwipeLeft(element, Math.abs(distX));
                    }
                } else if (Math.abs(distY) >= config.threshold && Math.abs(distX) <= config.restraint) {
                    // Vertical swipe
                    if (distY > 0 && config.onSwipeDown) {
                        config.onSwipeDown(element, distY);
                    } else if (distY < 0 && config.onSwipeUp) {
                        config.onSwipeUp(element, Math.abs(distY));
                    }
                }
            }
        }
    }

    handleJobCardSwipeLeft(card) {
        // Add to favorites or save for later
        card.classList.add('secid-job-card--swiped-left');
        this.animateCardSwipe(card, 'left');
        
        // Show feedback
        this.showToast('Job saved for later', 'success', 2000);
        
        // Emit custom event
        card.dispatchEvent(new CustomEvent('jobSwiped', {
            detail: { direction: 'left', action: 'save' }
        }));
    }

    handleJobCardSwipeRight(card) {
        // Apply to job or show interest
        card.classList.add('secid-job-card--swiped-right');
        this.animateCardSwipe(card, 'right');
        
        // Show feedback
        this.showToast('Interest shown in job', 'success', 2000);
        
        // Emit custom event
        card.dispatchEvent(new CustomEvent('jobSwiped', {
            detail: { direction: 'right', action: 'apply' }
        }));
    }

    handleMemberCardSwipeLeft(card) {
        // Skip member
        card.classList.add('secid-member-card--swiped-left');
        this.animateCardSwipe(card, 'left');
        
        // Emit custom event
        card.dispatchEvent(new CustomEvent('memberSwiped', {
            detail: { direction: 'left', action: 'skip' }
        }));
    }

    handleMemberCardSwipeRight(card) {
        // Connect with member
        card.classList.add('secid-member-card--swiped-right');
        this.animateCardSwipe(card, 'right');
        
        // Show feedback
        this.showToast('Connection request sent', 'success', 2000);
        
        // Emit custom event
        card.dispatchEvent(new CustomEvent('memberSwiped', {
            detail: { direction: 'right', action: 'connect' }
        }));
    }

    animateCardSwipe(card, direction) {
        const translateX = direction === 'left' ? '-100%' : '100%';
        const rotateZ = direction === 'left' ? '-15deg' : '15deg';
        
        card.style.transform = `translateX(${translateX}) rotateZ(${rotateZ})`;
        card.style.opacity = '0';
        
        // Remove card after animation
        setTimeout(() => {
            if (card.parentNode) {
                card.style.display = 'none';
                // Or remove completely: card.remove();
            }
        }, 300);
    }

    addCarouselSwipe(carousel) {
        const items = carousel.querySelectorAll('[data-carousel-item]');
        if (items.length === 0) return;

        let currentIndex = 0;

        this.makeSwipeable(carousel, {
            onSwipeLeft: () => {
                // Next item
                currentIndex = (currentIndex + 1) % items.length;
                this.scrollCarouselToIndex(carousel, currentIndex);
            },
            onSwipeRight: () => {
                // Previous item
                currentIndex = (currentIndex - 1 + items.length) % items.length;
                this.scrollCarouselToIndex(carousel, currentIndex);
            },
            threshold: 75
        });
    }

    scrollCarouselToIndex(carousel, index) {
        const items = carousel.querySelectorAll('[data-carousel-item]');
        if (items[index]) {
            items[index].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
            
            // Update active states
            items.forEach((item, i) => {
                item.classList.toggle('active', i === index);
            });
        }
    }

    // ========== UTILITY METHODS ==========
    
    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copiado al portapapeles', 'success');
        } catch (err) {
            this.showToast('Error al copiar', 'error');
        }
    }

    // Format currency
    formatCurrency(amount, currency = 'MXN') {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Format date
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        
        return new Intl.DateTimeFormat('es-MX', { ...defaultOptions, ...options })
            .format(new Date(date));
    }
}

// CSS animations
const animationCSS = `
    @keyframes secid-ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    @keyframes secid-animate-in {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .secid-animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }

    .secid-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: var(--z-modal, 1050);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    .secid-modal--open {
        opacity: 1;
        visibility: visible;
    }

    .secid-modal__content {
        background: white;
        border-radius: var(--radius-xl, 1rem);
        padding: var(--space-2xl, 3rem);
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        transform: scale(0.8);
        transition: transform 0.3s ease;
    }

    .secid-modal--open .secid-modal__content {
        transform: scale(1);
    }

    .secid-navbar__mobile-toggle--open span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }

    .secid-navbar__mobile-toggle--open span:nth-child(2) {
        opacity: 0;
    }

    .secid-navbar__mobile-toggle--open span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }

    .secid-form__group--focused .secid-form__label {
        color: var(--secid-primary, #F65425);
    }
`;

// Inject animation CSS
const styleElement = document.createElement('style');
styleElement.textContent = animationCSS;
document.head.appendChild(styleElement);

// Initialize components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SECiDComponents();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SECiDComponents;
}