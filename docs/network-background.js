(() => {
  "use strict";

  const skipLink = document.querySelector(".skip-link");
  if (skipLink && skipLink.parentElement !== document.body) {
    document.body.prepend(skipLink);
  } else if (skipLink) {
    document.body.prepend(skipLink);
  }

  document.querySelectorAll(".viz-disclosure").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      const frame = details.querySelector("iframe[data-src]");
      if (frame && !frame.getAttribute("src")) {
        frame.setAttribute("src", frame.dataset.src);
      }
    });
  });
})();

(() => {
  "use strict";

  const opening = document.querySelector(".opening");
  if (!opening) return;

  const host = document.getElementById("quarto-content");
  if (!host) return;

  const canvas = document.createElement("canvas");
  canvas.id = "network-background";
  canvas.className = "network-background-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.setAttribute("role", "presentation");
  host.classList.add("network-background-host");
  host.insertBefore(canvas, host.firstChild);

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    canvas.remove();
    return;
  }

  const POINTER_RADIUS = 180;
  const POINTER_FORCE = 0.0015;
  const MAX_DPR = 2;
  const COLOR = [26, 24, 20];
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const contrastPreference = window.matchMedia("(prefers-contrast: more)");

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let animationFrame = 0;
  let resizeFrame = 0;
  let lastTime = 0;
  let reducedMotion = motionPreference.matches || contrastPreference.matches;
  let openingVisible = true;

  const pointer = { active: false, x: 0, y: 0 };

  const randomBetween = (minimum, maximum) =>
    minimum + Math.random() * (maximum - minimum);

  const gutterWidth = () => {
    const column = document.querySelector("main.content");
    if (!column) return 0;
    return Math.max(0, column.getBoundingClientRect().left);
  };

  const settingsForGutter = (gutter) => {
    if (gutter < 56) {
      return null;
    }
    if (gutter < 180) {
      return {
        perSide: 7,
        linkDistance: 120,
        nodeOpacity: 0.62,
        edgeOpacity: 0.28,
        radiusMin: 1.1,
        radiusMax: 1.7,
        speed: 0.012,
      };
    }
      return {
        perSide: 12,
        linkDistance: 160,
        nodeOpacity: 0.72,
        edgeOpacity: 0.34,
        radiusMin: 1.3,
        radiusMax: 2.1,
        speed: 0.016,
      };
  };

  let settings = settingsForGutter(gutterWidth());

  const randomGutterPoint = (gutter) => {
    const edge = 18;
    const span = Math.max(8, gutter - edge * 2);
    const local = edge + Math.random() * span;
    const x = Math.random() < 0.5 ? local : width - local;
    return {
      x,
      y: randomBetween(24, Math.max(25, height - 24)),
    };
  };

  const createNode = () => {
    const gutter = gutterWidth();
    const position = randomGutterPoint(gutter);
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(settings.speed * 0.4, settings.speed);
    return {
      x: position.x,
      y: position.y,
      homeX: position.x,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      offsetX: 0,
      offsetY: 0,
      offsetVelocityX: 0,
      offsetVelocityY: 0,
      radius: randomBetween(settings.radiusMin, settings.radiusMax),
    };
  };

  const rebuildNodes = () => {
    settings = settingsForGutter(gutterWidth());
    nodes = [];
    if (!settings) return;
    const count = settings.perSide * 2;
    for (let index = 0; index < count; index += 1) nodes.push(createNode());
  };

  const resizeCanvas = () => {
    const hostTop = host.getBoundingClientRect().top + window.scrollY;
    const openingBottom = opening.getBoundingClientRect().bottom + window.scrollY;
    width = document.documentElement.clientWidth;
    height = Math.max(520, Math.round(openingBottom - hostTop + 96));
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildNodes();
    draw();
  };

  const keepInGutter = (node) => {
    const gutter = gutterWidth();
    const margin = 10;
    const onLeft = node.homeX < width / 2;
    const minX = onLeft ? margin : width - gutter + margin;
    const maxX = onLeft ? gutter - margin : width - margin;
    if (node.x < minX) node.x = maxX;
    if (node.x > maxX) node.x = minX;
    if (node.y < -margin) node.y = height + margin;
    if (node.y > height + margin) node.y = -margin;
  };

  const updateNode = (node, frameScale, elapsedMilliseconds) => {
    node.x += node.velocityX * frameScale;
    node.y += node.velocityY * frameScale;
    keepInGutter(node);

    let targetOffsetX = 0;
    let targetOffsetY = 0;
    if (pointer.active) {
      const deltaX = pointer.x - node.x;
      const deltaY = pointer.y - node.y;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > 0 && distance < POINTER_RADIUS) {
        const falloff = 1 - distance / POINTER_RADIUS;
        const displacement = 7 * falloff * falloff;
        targetOffsetX = (deltaX / distance) * displacement;
        targetOffsetY = (deltaY / distance) * displacement;
      }
    }

    const force = POINTER_FORCE * Math.min(elapsedMilliseconds, 32);
    node.offsetVelocityX += (targetOffsetX - node.offsetX) * force;
    node.offsetVelocityY += (targetOffsetY - node.offsetY) * force;
    const damping = Math.pow(0.86, frameScale);
    node.offsetVelocityX *= damping;
    node.offsetVelocityY *= damping;
    node.offsetX += node.offsetVelocityX * frameScale;
    node.offsetY += node.offsetVelocityY * frameScale;
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    if (!settings) return;

    for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
      const first = nodes[firstIndex];
      const firstX = first.x + first.offsetX;
      const firstY = first.y + first.offsetY;
      for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
        const second = nodes[secondIndex];
        const sameSide = (first.homeX < width / 2) === (second.homeX < width / 2);
        if (!sameSide) continue;
        const secondX = second.x + second.offsetX;
        const secondY = second.y + second.offsetY;
        const distance = Math.hypot(secondX - firstX, secondY - firstY);
        if (distance >= settings.linkDistance) continue;
        const proximity = 1 - distance / settings.linkDistance;
        context.beginPath();
        context.moveTo(firstX, firstY);
        context.lineTo(secondX, secondY);
        context.lineWidth = 0.7;
        context.strokeStyle = `rgba(${COLOR.join(",")},${settings.edgeOpacity * proximity})`;
        context.stroke();
      }
    }

    nodes.forEach((node) => {
      context.beginPath();
      context.arc(node.x + node.offsetX, node.y + node.offsetY, node.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${COLOR.join(",")},${settings.nodeOpacity})`;
      context.fill();
    });
  };

  const animate = (time) => {
    if (document.hidden || reducedMotion || !openingVisible) {
      animationFrame = 0;
      return;
    }
    const elapsed = lastTime ? Math.min(time - lastTime, 32) : 16.67;
    const frameScale = elapsed / 16.67;
    lastTime = time;
    nodes.forEach((node) => updateNode(node, frameScale, elapsed));
    draw();
    animationFrame = window.requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (animationFrame || document.hidden || reducedMotion || !openingVisible) return;
    lastTime = 0;
    animationFrame = window.requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (!animationFrame) return;
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const updatePointer = (event) => {
    if (reducedMotion) return;
    const bounds = canvas.getBoundingClientRect();
    const inside =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom;
    pointer.active = inside;
    if (inside) {
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
    }
  };

  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  window.addEventListener("blur", () => {
    pointer.active = false;
  });
  window.addEventListener("resize", () => {
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      resizeCanvas();
    });
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAnimation();
    else startAnimation();
  });

  const handleMotionPreference = () => {
    reducedMotion = motionPreference.matches || contrastPreference.matches;
    pointer.active = false;
    nodes.forEach((node) => {
      node.offsetX = 0;
      node.offsetY = 0;
      node.offsetVelocityX = 0;
      node.offsetVelocityY = 0;
    });
    if (reducedMotion) stopAnimation();
    draw();
    if (!reducedMotion) startAnimation();
  };

  if (typeof motionPreference.addEventListener === "function") {
    motionPreference.addEventListener("change", handleMotionPreference);
    contrastPreference.addEventListener("change", handleMotionPreference);
  }

  const visibility = new IntersectionObserver((entries) => {
    openingVisible = entries.some((entry) => entry.isIntersecting);
    if (openingVisible) startAnimation();
    else stopAnimation();
  });
  visibility.observe(opening);

  resizeCanvas();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => resizeCanvas());
  }
  window.addEventListener("load", () => resizeCanvas());
  startAnimation();
})();
