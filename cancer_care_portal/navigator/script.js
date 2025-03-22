// Mobile menu toggle
document.querySelector('.menu-toggle').addEventListener('click', function() {
    document.querySelector('.sidebar').classList.toggle('active');
  });
  
  // Sidebar toggle function
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
  }
  
  // Sidebar menu item click
  const menuItems = document.querySelectorAll('.sidebar ul li');
  menuItems.forEach(item => {
    item.addEventListener('click', function() {
      menuItems.forEach(i => i.classList.remove('active'));
      this.classList.add('active');
    });
  });
  
  // Task checkboxes functionality
  const checkboxes = document.querySelectorAll('.task-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        this.parentElement.style.opacity = '0.5';
        this.nextElementSibling.style.textDecoration = 'line-through';
      } else {
        this.parentElement.style.opacity = '1';
        this.nextElementSibling.style.textDecoration = 'none';
      }
    });
  });
  
  // Action buttons functionality
  const actionButtons = document.querySelectorAll('.action-button');
  actionButtons.forEach(button => {
    button.addEventListener('click', function() {
      const action = this.textContent.trim();
      const patient = this.closest('.activity-item').querySelector('h4').textContent;
      alert(`Action: ${action} for patient: ${patient}`);
    });
  });
  
  // View all button
  document.querySelector('.view-all-btn').addEventListener('click', function() {
    alert('Viewing all patient activities');
  });
  
  // Add new task button
  document.querySelector('.add-task-btn').addEventListener('click', function() {
    const taskDescription = prompt('Enter task description:');
    if (taskDescription) {
      const priorityOptions = ['High Priority', 'Medium Priority', 'Normal Priority'];
      const priorityClasses = ['priority-high', 'priority-medium', 'priority-normal'];
      const priorityIndex = Math.floor(Math.random() * 3);
      
      const taskHTML = `
        <div class="task-item">
          <input type="checkbox" class="task-checkbox">
          <div class="task-info">
            <p class="task-description">${taskDescription}</p>
            <span class="task-priority ${priorityClasses[priorityIndex]}">${priorityOptions[priorityIndex]}</span>
          </div>
        </div>
      `;
      
      document.querySelector('.tasks-container').insertAdjacentHTML('beforeend', taskHTML);
      
      // Add event listener to the new checkbox
      const newCheckbox = document.querySelector('.tasks-container .task-item:last-child .task-checkbox');
      newCheckbox.addEventListener('change', function() {
        if (this.checked) {
          this.parentElement.style.opacity = '0.5';
          this.nextElementSibling.style.textDecoration = 'line-through';
        } else {
          this.parentElement.style.opacity = '1';
          this.nextElementSibling.style.textDecoration = 'none';
        }
      });
    }
  });
  
  // Logout button
  document.querySelector('.logout').addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
      alert('You have been logged out successfully');
      // In a real application, this would redirect to the login page
    }
  });








  











  // Additional JavaScript for My Patients Page

// Open and close modals
const modals = document.querySelectorAll('.modal');
const openModalButtons = document.querySelectorAll('[data-modal-target]');
const closeModalButtons = document.querySelectorAll('.modal-close');

openModalButtons.forEach(button => {
  button.addEventListener('click', () => {
    const modal = document.querySelector(button.dataset.modalTarget);
    modal.style.display = 'flex';
  });
});

closeModalButtons.forEach(button => {
  button.addEventListener('click', () => {
    const modal = button.closest('.modal');
    modal.style.display = 'none';
  });
});

// Close modal when clicking outside of it
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// Handle patient actions (view, edit, delete)
const viewButtons = document.querySelectorAll('.view-btn');
const editButtons = document.querySelectorAll('.edit-btn');
const deleteButtons = document.querySelectorAll('.delete-btn');

viewButtons.forEach(button => {
  button.addEventListener('click', () => {
    const patientId = button.dataset.patientId;
    alert(`View patient with ID: ${patientId}`);
  });
});

editButtons.forEach(button => {
  button.addEventListener('click', () => {
    const patientId = button.dataset.patientId;
    alert(`Edit patient with ID: ${patientId}`);
  });
});

deleteButtons.forEach(button => {
  button.addEventListener('click', () => {
    const patientId = button.dataset.patientId;
    if (confirm(`Are you sure you want to delete patient with ID: ${patientId}?`)) {
      alert(`Patient with ID: ${patientId} deleted`);
    }
  });
});

// Add new patient form submission
const addPatientForm = document.getElementById('patient-form');
addPatientForm.addEventListener('submit', (e) => {
  e.preventDefault();
  alert('New patient added');
  document.getElementById('patient-form-modal').style.display = 'none';
});