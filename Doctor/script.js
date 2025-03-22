document.addEventListener('DOMContentLoaded', function() {
    // Toggle sidebar on mobile
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (sidebar && sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && e.target !== menuToggle) {
            sidebar.classList.remove('active');
        }
    });
    document.getElementById('exportBtn').addEventListener('click', function () {
        const rows = document.querySelectorAll('.patients-table tbody tr');
        let csvContent = "data:text/csv;charset=utf-8,";
    
        // Add headers
        const headers = [];
        document.querySelectorAll('.patients-table thead th').forEach(header => {
            headers.push(header.innerText.trim());
        });
        csvContent += headers.join(',') + '\n';
    
        // Add rows
        rows.forEach(row => {
            const rowData = [];
            row.querySelectorAll('td').forEach(cell => {
                rowData.push(cell.innerText.trim());
            });
            csvContent += rowData.join(',') + '\n';
        });
    
        // Create a downloadable file
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'patients_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    document.addEventListener('DOMContentLoaded', function() {
        // Mobile menu toggle
        document.getElementById('menuToggle').addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('active');
        });
    
        // Add new certification
        document.querySelector('.add-certification button').addEventListener('click', function() {
            const certificationsList = document.querySelector('.certifications-list');
            const newCertification = document.createElement('div');
            newCertification.classList.add('certification-item');
            newCertification.innerHTML = `
                <div class="certification-icon bg-primary">
                    <i class="fas fa-award"></i>
                </div>
                <div class="certification-details">
                    <div class="certification-name">New Certification</div>
                    <div class="certification-info">Details about the new certification</div>
                </div>
                <div class="certification-status valid">
                    <i class="fas fa-check-circle"></i> Valid
                </div>
                <div class="certification-actions">
                    <button class="btn-icon edit-btn"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            `;
            certificationsList.appendChild(newCertification);
        });
    
        // Tab navigation and smooth scrolling
        function scrollToSection(sectionId) {
            const section = document.getElementById(sectionId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        }
    
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Scroll to the corresponding section
                const tab = this.getAttribute('data-tab');
                scrollToSection(`${tab}-content`);
            });
        });
    });
    // Notifications popup
    const notificationBell = document.getElementById('notificationBell');
    const notificationsPopup = document.getElementById('notificationsPopup');
    
    if (notificationBell && notificationsPopup) {
        notificationBell.addEventListener('click', function(e) {
            e.stopPropagation();
            notificationsPopup.classList.toggle('show');
        });
        
        // Close notifications when clicking outside
        document.addEventListener('click', function(e) {
            if (notificationsPopup.classList.contains('show') && 
                !notificationsPopup.contains(e.target) && 
                e.target !== notificationBell) {
                notificationsPopup.classList.remove('show');
            }
        });
        
        // Mark all as read button
        const markAllRead = document.querySelector('.mark-all-read');
        if (markAllRead) {
            markAllRead.addEventListener('click', function() {
                const unreadItems = document.querySelectorAll('.notification-item.unread');
                unreadItems.forEach(item => {
                    item.classList.remove('unread');
                });
                
                // Update notification count
                const notificationCount = document.querySelector('.notification-count');
                if (notificationCount) {
                    notificationCount.textContent = '0';
                    notificationCount.style.display = 'none';
                }
            });
        }
    }
    
    // Date filter functionality
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            // Here you would typically fetch and update data based on selected date range
            console.log('Date filter changed to:', dateFilter.value);
            // For demonstration, we could update the summary numbers
            const randomChange = () => Math.floor(Math.random() * 20) - 5;
            const summaryCountElements = document.querySelectorAll('.summary-count');
            
            summaryCountElements.forEach(element => {
                const currentValue = parseInt(element.textContent);
                const newValue = Math.max(0, currentValue + randomChange());
                element.textContent = newValue;
                
                const statusElement = element.nextElementSibling.querySelector('span');
                const icon = statusElement.querySelector('i');
                const percentChange = Math.floor(Math.random() * 20) - 5;
                
                statusElement.textContent = '';
                statusElement.appendChild(icon);
                statusElement.innerHTML += ` ${Math.abs(percentChange)}%`;
                
                if (percentChange >= 0) {
                    statusElement.classList.remove('down');
                    statusElement.classList.add('up');
                    icon.className = 'fas fa-arrow-up';
                } else {
                    statusElement.classList.remove('up');
                    statusElement.classList.add('down');
                    icon.className = 'fas fa-arrow-down';
                }
            });
        });
    }
    
    // Add hover effect to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 0.5rem 2rem 0 rgba(58, 59, 69, 0.2)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.boxShadow = '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.1)';
        });
    });
    
    // Appointment actions
    const appointmentButtons = document.querySelectorAll('.btn-action');
    appointmentButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const appointmentItem = this.closest('.appointment-item');
            
            if (this.classList.contains('btn-accept')) {
                // Start video call or accept appointment logic
                console.log('Video call started');
                // For demo, add a "started" indicator
                const indicator = document.createElement('span');
                indicator.className = 'tag';
                indicator.style.backgroundColor = 'var(--success-light)';
                indicator.style.color = 'var(--success)';
                indicator.textContent = 'Started';
                
                const appointmentType = appointmentItem.querySelector('.appointment-type');
                appointmentType.appendChild(indicator);
                
                this.disabled = true;
                this.style.opacity = '0.5';
            } else if (this.classList.contains('btn-cancel')) {
                // Cancel appointment logic
                console.log('Appointment cancelled');
                // For demo, fade out the appointment
                appointmentItem.style.opacity = '0.5';
                const buttons = appointmentItem.querySelectorAll('.btn-action');
                buttons.forEach(btn => {
                    btn.disabled = true;
                });
            }
        });
    });
});