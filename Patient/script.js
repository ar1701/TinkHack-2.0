document.addEventListener('DOMContentLoaded', function () {
    // ============================================
    // Element References
    // ============================================
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const navLinks = document.querySelectorAll('.sidebar ul li a');
    const editButton = document.querySelector('.edit-button');
    const notificationBell = document.querySelector('.notification-bell');
    const profileImage = document.querySelector('.profile-image');
    const cards = document.querySelectorAll('.card');

    // ============================================
    // Mobile Navigation
    // ============================================
    if (menuToggle) {
        menuToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }

    // Close sidebar when clicking outside (for mobile)
    document.addEventListener('click', function (event) {
        if (sidebar && menuToggle) {
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickOnMenuToggle = menuToggle.contains(event.target);

            if (!isClickInsideSidebar && !isClickOnMenuToggle && window.innerWidth <= 991) {
                sidebar.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        }
    });

    // ============================================
    // Navigation & Page Handling
    // ============================================
    function setActiveNavItem() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href');
            const linkParent = link.parentElement;
            if (linkPage === currentPage) {
                linkParent.classList.add('active');
            } else {
                linkParent.classList.remove('active');
            }
        });
    }

    setActiveNavItem();

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            navLinks.forEach(item => {
                item.parentElement.classList.remove('active');
            });
            this.parentElement.classList.add('active');
            if (window.innerWidth <= 991) {
                sidebar.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    });

    // ============================================
    // Profile Functionality
    // ============================================
    if (editButton) {
        editButton.addEventListener('click', function () {
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay';

            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';

            const modalHeader = document.createElement('div');
            modalHeader.className = 'modal-header';
            modalHeader.innerHTML = `
                <h3>Edit Profile</h3>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            `;

            const modalBody = document.createElement('div');
            modalBody.className = 'modal-body';
            modalBody.innerHTML = `
                <form id="editProfileForm">
                    <div class="form-group">
                        <label for="fullName">Full Name</label>
                        <input type="text" id="fullName" value="John Doe" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" value="john.doe@example.com" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="phone">Phone</label>
                        <input type="tel" id="phone" value="+1 (555) 123-4567" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="address">Address</label>
                        <textarea id="address" class="form-control">123 Health Street, Medical City, MC 12345</textarea>
                    </div>
                    <div class="form-group">
                        <label for="emergencyContact">Emergency Contact</label>
                        <input type="text" id="emergencyContact" value="Jane Doe (+1 555-987-6543)" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="allergies">Allergies</label>
                        <input type="text" id="allergies" value="Penicillin, Peanuts" class="form-control">
                    </div>
                    <div class="form-buttons">
                        <button type="button" class="btn btn-cancel close-modal">Cancel</button>
                        <button type="submit" class="btn btn-save">Save Changes</button>
                    </div>
                </form>
            `;

            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modalOverlay.appendChild(modalContent);
            document.body.appendChild(modalOverlay);

            const closeButtons = document.querySelectorAll('.close-modal');
            closeButtons.forEach(button => {
                button.addEventListener('click', function () {
                    modalOverlay.classList.add('fade-out');
                    setTimeout(() => {
                        document.body.removeChild(modalOverlay);
                    }, 300);
                });
            });

            modalOverlay.addEventListener('click', function (e) {
                if (e.target === modalOverlay) {
                    modalOverlay.classList.add('fade-out');
                    setTimeout(() => {
                        document.body.removeChild(modalOverlay);
                    }, 300);
                }
            });

            const form = document.getElementById('editProfileForm');
            if (form) {
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    const fullName = document.getElementById('fullName').value;
                    const email = document.getElementById('email').value;
                    const phone = document.getElementById('phone').value;

                    if (!fullName || !email || !phone) {
                        alert('Please fill out all required fields');
                        return;
                    }

                    console.log('Form submitted:', {
                        fullName,
                        email,
                        phone,
                        address: document.getElementById('address').value,
                        emergencyContact: document.getElementById('emergencyContact').value,
                        allergies: document.getElementById('allergies').value
                    });

                    alert('Profile updated successfully!');
                    modalOverlay.classList.add('fade-out');
                    setTimeout(() => {
                        document.body.removeChild(modalOverlay);
                    }, 300);
                });
            }
        });
    }

    if (profileImage) {
        profileImage.addEventListener('click', function () {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.click();

            fileInput.addEventListener('change', function () {
                const file = this.files[0];
                if (file) {
                    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
                    const maxSize = 5 * 1024 * 1024; // 5MB

                    if (!validTypes.includes(file.type)) {
                        alert('Please select a valid image file (JPEG, PNG, or GIF)');
                        return;
                    }

                    if (file.size > maxSize) {
                        alert('Image size should be less than 5MB');
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = function (e) {
                        profileImage.src = e.target.result;
                        console.log('Profile image changed, ready for upload');
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
    }

    // ============================================
    // Notifications
    // ============================================
    if (notificationBell) {
        notificationBell.addEventListener('click', function () {
            let notificationsPopup = document.querySelector('.notifications-popup');

            if (notificationsPopup) {
                notificationsPopup.classList.toggle('show');
                return;
            }

            notificationsPopup = document.createElement('div');
            notificationsPopup.className = 'notifications-popup show';
            notificationsPopup.innerHTML = `
                <div class="notifications-header">
                    <h3>Notifications</h3>
                    <button class="mark-all-read">Mark all as read</button>
                </div>
                <div class="notifications-list">
                    <div class="notification-item unread">
                        <div class="notification-icon bg-primary">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">Appointment Reminder</div>
                            <div class="notification-message">Your appointment with Dr. Sarah Johnson is tomorrow at 10:00 AM.</div>
                            <div class="notification-time">2 hours ago</div>
                        </div>
                    </div>
                    <div class="notification-item unread">
                        <div class="notification-icon bg-info">
                            <i class="fas fa-file-medical"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">Lab Results Available</div>
                            <div class="notification-message">Your recent lab test results are now available. Click to view.</div>
                            <div class="notification-time">Yesterday</div>
                        </div>
                    </div>
                    <div class="notification-item">
                        <div class="notification-icon bg-success">
                            <i class="fas fa-pills"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">Medication Reminder</div>
                            <div class="notification-message">Remember to refill your Lisinopril prescription.</div>
                            <div class="notification-time">3 days ago</div>
                        </div>
                    </div>
                </div>
                <div class="notifications-footer">
                    <a href="notifications.html">View all notifications</a>
                </div>
            `;

            const rect = notificationBell.getBoundingClientRect();
            notificationsPopup.style.position = 'absolute';
            notificationsPopup.style.top = (rect.bottom + 10) + 'px';
            notificationsPopup.style.right = (window.innerWidth - rect.right) + 'px';
            document.body.appendChild(notificationsPopup);

            document.addEventListener('click', function (e) {
                if (notificationsPopup && !notificationsPopup.contains(e.target) && !notificationBell.contains(e.target)) {
                    notificationsPopup.classList.remove('show');
                }
            });

            const markAllReadBtn = document.querySelector('.mark-all-read');
            if (markAllReadBtn) {
                markAllReadBtn.addEventListener('click', function () {
                    const unreadItems = document.querySelectorAll('.notification-item.unread');
                    unreadItems.forEach(item => {
                        item.classList.remove('unread');
                    });
                    const notificationCount = document.querySelector('.notification-count');
                    if (notificationCount) {
                        notificationCount.textContent = '0';
                    }
                });
            }
        });
    }

    // ============================================
    // UI Animations & Effects
    // ============================================
    function animateCards() {
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 * index);
        });
    }

    animateCards();

    window.addEventListener('resize', function () {
        if (window.innerWidth > 991 && sidebar) {
            sidebar.classList.remove('active');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    });

    // ============================================
    // Page-specific functionality
    // ============================================
    function initPageSpecificFeatures() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        switch (currentPage) {
            case 'index.html':
                initializeProfilePage();
                break;
            // Add more pages as needed
        }
    }

    function initializeProfilePage() {
        console.log('Profile page initialized');
    }

    initPageSpecificFeatures();
});