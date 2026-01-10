// Particle Canvas Logic
const initParticles = () => {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas || window.innerWidth < 720) return;
  
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight * 0.58);
    let parts = [];
  
    const create = () => {
      const n = Math.round((width * height) / 80000);
      parts = [];
      for (let i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.6 + 0.6,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          a: Math.random() * 0.6 + 0.05,
        });
      }
    };
    create();
  
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw Particles
      for (const p of parts) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(143,210,255,${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
  
      // Link Lines
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i];
          const b = parts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          
          if (d < 90) {
            ctx.strokeStyle = `rgba(143,210,255,${0.06 * (1 - d / 90)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    };
  
    const step = () => {
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce off edges (or wrap around loops)
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;
      }
      draw();
      requestAnimationFrame(step);
    };
    step();
  
    // Resize Handler
    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight * 0.58;
      create();
    });
  };
  
  // Reveal on Scroll Logic
  const initScrollReveal = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target); // Only trigger once
          }
        });
      },
      { threshold: 0.15 }
    );
  
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
  };

  // Navbar Scroll Logic
  const initNavbar = () => {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
  };
  
  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
    initParticles();
    initScrollReveal();
    initNavbar();
  });
