// Function to show sections in dashboard
function showSection(sectionId) {
  const cards = document.querySelectorAll('.main-content .card');
  
  // First hide all cards with animation
  cards.forEach(card => {
    if (card.style.display !== 'none') {
      card.classList.add('fade-out');
      setTimeout(() => {
        card.style.display = 'none';
        card.classList.remove('fade-out');
      }, 300);
    }
  });
  
  // Then show the selected card with animation
  setTimeout(() => {
    const selectedCard = document.getElementById(sectionId);
    selectedCard.style.display = 'block';
    selectedCard.classList.add('slide-in');
    setTimeout(() => {
      selectedCard.classList.remove('slide-in');
    }, 500);
  }, 300);
}

// Function to animate and navigate to another page
function animateAndNavigate(url) {
  document.querySelector('.login-container').classList.add('animate__fadeOut');
  setTimeout(() => {
    window.location.href = url;
  }, 500);
}

// Initialize dashboard animations
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on a dashboard page
  const sidebar = document.querySelector('.sidebar');
  
  if (sidebar) {
    // Add icons to sidebar menu items
    const menuItems = {
      'overview': 'fas fa-home',
      'myReports': 'fas fa-file-medical-alt',
      'appointments': 'fas fa-calendar-check',
      'feedback': 'fas fa-comment-dots',
      'patients': 'fas fa-user-injured',
      'comments': 'fas fa-comment-medical',
      'generate': 'fas fa-file-export',
      'patientList': 'fas fa-users',
      'viewReports': 'fas fa-chart-line',
      'schedule': 'fas fa-calendar-plus'
    };
    
    // Add icons to menu items
    const sidebarItems = sidebar.querySelectorAll('ul li');
    sidebarItems.forEach(item => {
      const onclick = item.getAttribute('onclick');
      if (onclick) {
        const sectionMatch = onclick.match(/showSection\('(.+?)'\)/);
        if (sectionMatch && sectionMatch[1]) {
          const sectionId = sectionMatch[1];
          const icon = menuItems[sectionId] || 'fas fa-circle';
          
          // Add icon before text
          const text = item.textContent;
          item.innerHTML = `<i class="${icon}"></i> ${text}`;
        }
      } else if (item.textContent.trim().toLowerCase() === 'logout') {
        // Add icon to logout
        item.innerHTML = `<i class="fas fa-sign-out-alt"></i> Logout`;
      }
    });
    
    // Add responsive menu toggle
    const body = document.querySelector('body');
    const menuToggle = document.createElement('div');
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    
    menuToggle.addEventListener('click', function() {
      sidebar.classList.toggle('active');
      
      // Change icon based on sidebar state
      if (sidebar.classList.contains('active')) {
        this.innerHTML = '<i class="fas fa-times"></i>';
      } else {
        this.innerHTML = '<i class="fas fa-bars"></i>';
      }
    });
    
    body.appendChild(menuToggle);
    
    // Animate the first card on load
    const firstCard = document.querySelector('.main-content .card');
    if (firstCard && firstCard.style.display !== 'none') {
      firstCard.classList.add('slide-in');
      setTimeout(() => {
        firstCard.classList.remove('slide-in');
      }, 500);
    }
  }
  
  // Add hover animations for buttons
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      button.classList.add('animate__animated', 'animate__pulse');
    });
    
    button.addEventListener('mouseleave', () => {
      button.classList.remove('animate__animated', 'animate__pulse');
    });
  });
});