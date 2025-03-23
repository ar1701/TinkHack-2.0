/**
 * Patient Theme Interactive Effects
 * Adds animation and interactive elements to the patient portal
 */

document.addEventListener("DOMContentLoaded", function () {
  // Initialize AOS animations if available
  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 800,
      once: true,
      offset: 50,
    });
  }

  // Add hover effects to cards
  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    card.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-8px)";
      this.style.boxShadow = "var(--card-shadow-hover)";
    });

    card.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)";
      this.style.boxShadow = "var(--card-shadow)";
    });
  });

  // Add click effects to buttons
  const buttons = document.querySelectorAll(".btn");
  buttons.forEach((button) => {
    button.addEventListener("mousedown", function () {
      this.style.transform = "scale(0.95)";
    });

    button.addEventListener("mouseup", function () {
      this.style.transform = "scale(1)";
    });

    button.addEventListener("mouseleave", function () {
      this.style.transform = "scale(1)";
    });
  });

  // Add random subtle animations to icons in card titles
  const cardIcons = document.querySelectorAll(".card-title i");
  cardIcons.forEach((icon) => {
    // Random subtle animations
    const animations = ["pulse", "float", "shake", "bounce"];
    const randomAnimation =
      animations[Math.floor(Math.random() * animations.length)];

    // Add the animation class
    icon.classList.add(randomAnimation);
  });

  // Toggle mobile menu
  const menuToggle = document.querySelector(".mobile-menu-toggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      const sidebar = document.querySelector(".sidebar");
      sidebar.classList.toggle("active");
    });
  }

  // Create floating shapes in the background (decorative)
  createFloatingShapes();
});

// Create floating medical-themed shapes in the background
function createFloatingShapes() {
  const mainContent = document.querySelector(".main-content");
  if (!mainContent) return;

  const shapes = ["heart", "plus", "pill", "stethoscope", "circle"];

  const colors = [
    "#1a91ff33",
    "#00c4b433",
    "#7d5fff33",
    "#ff7eb633",
    "#ffd16633",
  ];

  // Create container for shapes
  const shapesContainer = document.createElement("div");
  shapesContainer.className = "floating-shapes";
  shapesContainer.style.position = "absolute";
  shapesContainer.style.top = "0";
  shapesContainer.style.left = "0";
  shapesContainer.style.width = "100%";
  shapesContainer.style.height = "100%";
  shapesContainer.style.pointerEvents = "none";
  shapesContainer.style.overflow = "hidden";
  shapesContainer.style.zIndex = "0";

  // Add shapes container to main content
  mainContent.style.position = "relative";
  mainContent.prepend(shapesContainer);

  // Create floating shapes
  for (let i = 0; i < 12; i++) {
    const shape = document.createElement("div");
    const shapeType = shapes[Math.floor(Math.random() * shapes.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.floor(Math.random() * 30) + 15; // 15-45px

    shape.className = `floating-shape ${shapeType}`;
    shape.style.position = "absolute";
    shape.style.width = `${size}px`;
    shape.style.height = `${size}px`;
    shape.style.backgroundColor = color;
    shape.style.borderRadius = shapeType === "circle" ? "50%" : "5px";

    // For plus shape
    if (shapeType === "plus") {
      shape.style.backgroundColor = "transparent";
      shape.style.width = `${size}px`;
      shape.style.height = `${size}px`;
      shape.style.position = "relative";

      const h = document.createElement("div");
      h.style.position = "absolute";
      h.style.width = `${size}px`;
      h.style.height = `${size / 3}px`;
      h.style.backgroundColor = color;
      h.style.top = `${size / 3}px`;
      h.style.borderRadius = "3px";

      const v = document.createElement("div");
      v.style.position = "absolute";
      v.style.width = `${size / 3}px`;
      v.style.height = `${size}px`;
      v.style.backgroundColor = color;
      v.style.left = `${size / 3}px`;
      v.style.borderRadius = "3px";

      shape.appendChild(h);
      shape.appendChild(v);
    }

    // For heart shape
    if (shapeType === "heart") {
      shape.style.backgroundColor = "transparent";
      shape.style.width = `${size}px`;
      shape.style.height = `${size}px`;
      shape.style.transform = "rotate(-45deg)";
      shape.style.position = "relative";

      const before = document.createElement("div");
      before.style.position = "absolute";
      before.style.width = `${size}px`;
      before.style.height = `${size}px`;
      before.style.backgroundColor = color;
      before.style.borderRadius = "50%";
      before.style.top = `${-size / 2}px`;

      const after = document.createElement("div");
      after.style.position = "absolute";
      after.style.width = `${size}px`;
      after.style.height = `${size}px`;
      after.style.backgroundColor = color;
      after.style.borderRadius = "50%";
      after.style.left = `${size / 2}px`;

      shape.style.backgroundColor = color;
      shape.appendChild(before);
      shape.appendChild(after);
    }

    // Random position
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    shape.style.left = `${left}%`;
    shape.style.top = `${top}%`;

    // Random animation
    const duration = Math.floor(Math.random() * 30) + 15; // 15-45s
    const delay = Math.floor(Math.random() * 10);

    shape.style.animation = `float ${duration}s ease-in-out ${delay}s infinite`;
    shape.style.opacity = "0.3";

    // Add to container
    shapesContainer.appendChild(shape);
  }

  // Add keyframes for floating animation
  if (!document.getElementById("floating-keyframes")) {
    const style = document.createElement("style");
    style.id = "floating-keyframes";
    style.innerHTML = `
      @keyframes float {
        0% {
          transform: translate(0, 0) rotate(0);
        }
        25% {
          transform: translate(10px, 10px) rotate(5deg);
        }
        50% {
          transform: translate(0, 20px) rotate(0);
        }
        75% {
          transform: translate(-10px, 10px) rotate(-5deg);
        }
        100% {
          transform: translate(0, 0) rotate(0);
        }
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
      
      .pulse {
        animation: pulse 2s infinite ease-in-out;
      }
      
      .float {
        animation: float 6s infinite ease-in-out;
      }
      
      @keyframes shake {
        0% { transform: rotate(0); }
        25% { transform: rotate(5deg); }
        50% { transform: rotate(0); }
        75% { transform: rotate(-5deg); }
        100% { transform: rotate(0); }
      }
      
      .shake {
        animation: shake 3s infinite ease-in-out;
      }
      
      @keyframes bounce {
        0% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
        100% { transform: translateY(0); }
      }
      
      .bounce {
        animation: bounce 2s infinite ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }
}
