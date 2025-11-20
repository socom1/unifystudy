// src/landing/LandingPage.jsx
import React, { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import "./LandingPage.scss";

/**
 * Advanced Landing Page (Hybrid Premium Developer Style)
 * - Parallax SVG layers
 * - Particle canvas
 * - Flow line SVG animations
 * - Reveal on scroll via IntersectionObserver
 * - Extra micro animations: typing cursor, ring pulses, floating cards, svg path dash animation
 */

function ParticleCanvas({ enabled = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!enabled || window.innerWidth < 720) return;
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight * 0.58);
    let parts = [];

    const create = (n = Math.round((width * height) / 80000)) => {
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

    let raf = null;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (let p of parts) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(143,210,255,${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // linking lines
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i],
            b = parts[j];
          const dx = a.x - b.x,
            dy = a.y - b.y;
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
      for (let p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;
      }
      draw();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight * 0.58;
      create();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled]);

  return <canvas ref={ref} className="landing-particles" />;
}

function FlowSVG() {
  return (
    <svg className="flow-svg" viewBox="0 0 1000 140" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fg" x1="0" x2="1">
          <stop offset="0" stopColor="#8fd2ff" />
          <stop offset="1" stopColor="#4b6c82" />
        </linearGradient>
      </defs>
      <path
        className="flow-path"
        d="M0,70 C150,20 300,120 500,80 C700,40 850,110 1000,70"
        stroke="url(#fg)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LandingPage() {
  const controls = useAnimation();

  useEffect(() => {
    controls.start({ opacity: 1, y: 0, transition: { duration: 0.7 } });
  }, [controls]);

  // Reveal on scroll
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) en.target.classList.add("in-view");
        });
      },
      { threshold: 0.18 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing-advanced-wrap">
      <div className="bg-layers">
        <svg
          className="bg-blob"
          viewBox="0 0 900 500"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="gA" x1="0" x2="1">
              <stop offset="0" stopColor="#0f2a33" />
              <stop offset="1" stopColor="#112a32" />
            </linearGradient>
          </defs>
          <path
            fill="url(#gA)"
            d="M0,120 C120,60 240,200 420,160 C600,120 720,240 900,180 L900,500 L0,500 Z"
          />
        </svg>

        <FlowSVG />
        <ParticleCanvas enabled={true} />
      </div>

      <header className="hero reveal" role="banner">
        <div className="hero-inner">
          <motion.div
            className="hero-left"
            initial={{ opacity: 0, y: 8 }}
            animate={controls}
          >
            <div className="kicker">Unifys</div>
            <h1 className="hero-title">
              Study with structure — not chaos.
              <span className="cursor">▌</span>
            </h1>
            <p className="hero-sub">
              Designed for students who code, create and care about time.
              Powerful tools—no fluff. Real focus. Real results.
            </p>

            <div className="hero-ctas">
              <a className="btn-primary" href="/signup">
                Create account — it's free
              </a>
              <a className="btn-ghost" href="#features">
                See the features
              </a>
            </div>

            <div className="hero-highlights">
              <div>
                <strong>One</strong> workspace for tasks, timers & timetable
              </div>
              <div>
                <strong>Flexible</strong> time segments — alarms & smart
                reminders
              </div>
              <div>
                <strong>Built</strong> for students who want to ship
              </div>
            </div>
          </motion.div>

          <motion.div
            className="hero-right"
            initial={{ opacity: 0, y: 12 }}
            animate={controls}
            transition={{ delay: 0.12 }}
          >
            <div className="mockup-cluster">
              {/* Mockup cards */}
              <div className="mockup mockup-lg floating-card">
                <div className="mockup-top">
                  <div className="dots">
                    <span className="d r" />
                    <span className="d y" />
                    <span className="d g" />
                  </div>
                  <div className="title">Today • 3 tasks</div>
                </div>
                <div className="mockup-body">
                  <div className="task">
                    <div className="left">
                      <div className="accent-bar" />
                      <div className="text">
                        <div className="t-title">
                          Read chapter 7 • Algorithms
                        </div>
                        <div className="t-meta">2h — High</div>
                      </div>
                    </div>
                    <div className="right">25m</div>
                  </div>

                  <div className="task">
                    <div className="left">
                      <div className="accent-bar" />
                      <div className="text">
                        <div className="t-title">Problem sheet practice</div>
                        <div className="t-meta">1h — Medium</div>
                      </div>
                    </div>
                    <div className="right">Pomodoro</div>
                  </div>

                  <div className="mockup-footer">
                    <div className="ring pulse-ring" />
                    <div className="mockup-actions">
                      <button className="mini">Start</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mockup mockup-sm floating-card">
                <div className="tt">Mon — 9:00 Data Struct</div>
                <div className="tt-min">Study • Lab</div>
              </div>

              <div className="code-strings">
                <span>const focus = ()=>start(25)</span>
                <span>{"// quick-add"}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </header>
      {/* Why We Built It Section */}
      {/* Why We Built It Section */}
      <section id="why" className="why reveal">
        <div className="section-head">
          <h2>Why We Built This</h2>
          <p className="lead">
            As students ourselves, we know the struggles of staying organized
            and focused. This app was built to help students like us manage
            tasks, track time, and reduce chaos in daily study life.
          </p>
        </div>

        <div className="why-code-sim">
          <pre>
            <code>
              {`unifys/
├─ about-us/
│    ├─ purpose.txt  // help students focus & stay organized
│    └─ story.txt    // built by students for students
├─ features/
│    ├─ tasks/
│    ├─ timers/
│    └─ timetable/
└─ get-started/`}
            </code>
          </pre>
          <span className="cursor">▌</span>
        </div>
      </section>

      {/* Features Section */}
      {/* Features Divider */}
      <div className="features-divider">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path
            d="M0,60 L1440,0 L1440,80 L0,80 Z"
            fill="#0c1214" // Matches the hero section fade-out
          />
        </svg>
      </div>
      <section id="features" className="features reveal">
        {/* <div className="features-divider" /> */}

        <div className="features-content">
          <div className="section-head">
            <h2>Features Built for Students</h2>
            <p className="lead">
              Created by students, for students — tools that help you focus and
              stay organized.
            </p>
          </div>

          <div className="features-row">
            {/* Code-style panel */}
            <div className="features-code">
              <pre>
                {`const features = [
  "Task Hierarchy",
  "Time Segment Alarms",
  "Pomodoro & Focus Rings",
  "Interactive Timetable"
];`}
              </pre>
            </div>

            {/* Text descriptions */}
            <div className="features-text">
              <div className="feature-item">
                <h3>Task Hierarchy</h3>
                <p>Organize tasks with nested views and focused workspaces.</p>
              </div>
              <div className="feature-item">
                <h3>Time Segment Alarms</h3>
                <p>Stay on track with smart timers, alarms, and reminders.</p>
              </div>
              <div className="feature-item">
                <h3>Pomodoro & Focus Rings</h3>
                <p>Visual rings help you maintain focus and consistency.</p>
              </div>
              <div className="feature-item">
                <h3>Interactive Timetable</h3>
                <p>Drag & drop study blocks and avoid scheduling conflicts.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* sign section */}
      <section className="feature-cta reveal">
        <motion.div
          className="cta-panel"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7 }}
          whileHover={{
            y: -8,
            scale: 1.01,
            boxShadow: "0 10px 30px rgba(143, 210, 255, 0.15)",
            transition: { type: "spring", stiffness: 300, damping: 20 },
          }}
        >
          <div className="cta-left">
            <h2>Ready to focus? It's free.</h2>
            <p className="lead">
              Join thousands of students who are turning chaos into structure.
              No payment required to get started.
            </p>
          </div>
          <div className="cta-right">
            <a className="btn-primary cta-btn" href="/signup">
              Create Your Free Account
            </a>
            <p className="cta-subtext">
              No credit card needed. Start in seconds.
            </p>
          </div>
        </motion.div>
      </section>
      {/* Testimonials/Social Proof Section (Replaces Demo) */}
      <section id="testimonials" className="testimonials reveal">
        <div className="section-head">
          <h2>Social Proof // Student Voices</h2>
          <p className="lead">
            Don't just take our word for it. Hear what students who have
            integrated Unifys into their workflow are saying.
          </p>
        </div>

        <motion.div
          className="testimonials-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { staggerChildren: 0.15, duration: 0.6 },
            },
          }}
        >
          {/* Testimonial 1: Focus */}
          <motion.div
            className="testimonial-card floating-card"
            variants={{
              hidden: { opacity: 0, scale: 0.95 },
              visible: { opacity: 1, scale: 1 },
            }}
            whileHover={{
              y: -8,
              boxShadow: "0 15px 40px rgba(143, 210, 255, 0.25)",
              transition: { type: "spring", stiffness: 300, damping: 20 },
            }}
          >
            <div className="quote-icon">
              <span role="img" aria-label="Quote">
                “
              </span>
            </div>
            <p className="quote">
              "The ability to structure my tasks and time segments in one place
              is a game-changer. I finally feel focused, not just busy."
            </p>
            <div className="author">
              <span className="name">Alex M.</span>, CompSci Student
            </div>
          </motion.div>

          {/* Testimonial 2: Aesthetic/Code */}
          <motion.div
            className="testimonial-card floating-card"
            variants={{
              hidden: { opacity: 0, scale: 0.95 },
              visible: { opacity: 1, scale: 1, transition: { delay: 0.15 } },
            }}
            whileHover={{
              y: -8,
              boxShadow: "0 15px 40px rgba(143, 210, 255, 0.25)",
              transition: { type: "spring", stiffness: 300, damping: 20 },
            }}
          >
            <div className="quote-icon">
              <span role="img" aria-label="Quote">
                “
              </span>
            </div>
            <p className="quote">
              "Love the developer-friendly dark mode aesthetic and the Pomodoro
              rings. It just clicks with my workflow."
            </p>
            <div className="author">
              <span className="name">Priya S.</span>, Design & Code
            </div>
          </motion.div>

          {/* Testimonial 3: Practical Use */}
          <motion.div
            className="testimonial-card floating-card"
            variants={{
              hidden: { opacity: 0, scale: 0.95 },
              visible: { opacity: 1, scale: 1, transition: { delay: 0.3 } },
            }}
            whileHover={{
              y: -8,
              boxShadow: "0 15px 40px rgba(143, 210, 255, 0.25)",
              transition: { type: "spring", stiffness: 300, damping: 20 },
            }}
          >
            <div className="quote-icon">
              <span role="img" aria-label="Quote">
                “
              </span>
            </div>
            <p className="quote">
              "Scheduling lab time used to be a mess. The interactive timetable
              and smart reminders make it painless. Highly recommend."
            </p>
            <div className="author">
              <span className="name">Ben C.</span>, Engineering Major
            </div>
          </motion.div>
        </motion.div>
      </section>
      {/* FAQ Section (New Section) */}
      <section id="faq" className="faq reveal">
        <div className="section-head">
          <h2>FAQ // Quick Answers</h2>
          <p className="lead">
            Everything you need to know about starting your structured study
            journey with Unifys.
          </p>
        </div>

        <div className="faq-grid">
          <div className="faq-item">
            <h3 className="faq-question">Q: Is Unifys really free to use?</h3>
            <p className="faq-answer">
              A: Yes. The core features, including the task manager and Pomodoro
              timer, are completely free forever. We may introduce premium
              features later, but the essentials remain free.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">
              Q: What platforms is Unifys available on?
            </h3>
            <p className="faq-answer">
              A: Currently, Unifys is a web application accessible via any
              modern browser (Chrome, Firefox, Safari). We are planning native
              mobile apps for iOS and Android in the future.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">Q: Is my data safe and private?</h3>
            <p className="faq-answer">
              A: Absolutely. We prioritize student privacy. All your data is
              securely stored and is never shared with third parties.
            </p>
          </div>
        </div>
      </section>
      <footer className="footer">
        <div className="footer-inner">
          <p className="footer-message">
            <span className="highlight">Made by students</span>, for students —
            because we know what focus feels like.
          </p>
          <p className="footer-sub">
            Built with ❤️ and code to help you study smarter, not harder.
          </p>
        </div>
      </footer>
    </div>
  );
}
