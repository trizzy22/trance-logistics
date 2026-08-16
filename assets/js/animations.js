// Intersection Observer for Scroll Animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in-on-scroll');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe elements for animation on scroll
document.addEventListener('DOMContentLoaded', () => {
  const elementsToObserve = document.querySelectorAll('[data-services] > div, [data-values] > div, [data-offices] > div, .process-step, .lane-table tbody tr');
  elementsToObserve.forEach(el => observer.observe(el));
});

// Parallax Effect for Hero Section
const heroMap = document.querySelector('[data-hero-map]');
if (heroMap) {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    heroMap.style.transform = `translateY(${scrollY * 0.5}px)`;
  });
}

// Smooth Scroll Behavior Enhancement
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Add animation class to elements on load
window.addEventListener('load', () => {
  document.querySelectorAll('[data-hero-headline], [data-hero-eyebrow], .hero-actions, [data-stats] > div').forEach((el, index) => {
    el.style.animationDelay = `${index * 0.1}s`;
  });
});

// Animate numbers in stats
function animateValue(element, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    element.textContent = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

// Trigger animation on stats visibility
const statsSection = document.querySelector('[data-stats]');
if (statsSection) {
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const statElements = entry.target.querySelectorAll('[data-stat-value]');
        statElements.forEach(stat => {
          const endValue = parseInt(stat.getAttribute('data-stat-value'));
          animateValue(stat, 0, endValue, 2000);
        });
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  statsObserver.observe(statsSection);
}

// Enhanced button ripple effect
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const ripple = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    btn.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });
});

// Mobile menu animation
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    navToggle.classList.toggle('active');
  });
}

// Scroll-triggered heading animation
const headings = document.querySelectorAll('h1, h2, h3');
headings.forEach(heading => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-on-scroll');
      }
    });
  }, { threshold: 0.3 });
  
  observer.observe(heading);
});

console.log('✨ Trance Logistics Animations Loaded Successfully');
