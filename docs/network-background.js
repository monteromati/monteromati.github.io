(() => {
  "use strict";

  const hero = document.querySelector(".hero-shell");
  if (!hero) return;

  const host = hero.parentElement;
  if (!host) return;

  const canvas = document.createElement("canvas");
  canvas.id = "network-background";
  canvas.className = "network-background-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.setAttribute("role", "presentation");
  host.classList.add("network-background-host");
  host.insertBefore(canvas, hero);

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    canvas.remove();
    return;
  }

  const POINTER_RADIUS = 220;
  const POINTER_FORCE = 0.0015;
  const MAX_DPR = 2;
  const COLOR = [22, 50, 79];
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let animationFrame = 0;
  let resizeFrame = 0;
  let lastTime = 0;
  let reducedMotion = motionPreference.matches;

  const pointer = {
    active: false,
    x: 0,
    y: 0,
  };

  const randomBetween = (minimum, maximum) =>
    minimum + Math.random() * (maximum - minimum);

  const settingsForWidth = (viewportWidth) => {
    if (viewportWidth < 640) {
      return {
        count: 14,
        linkDistance: 145,
        nodeOpacity: 0.12,
        edgeOpacity: 0.038,
        radiusMin: 0.9,
        radiusMax: 1.25,
        speed: 0.018,
      };
    }

    if (viewportWidth < 1024) {
      return {
        count: 22,
        linkDistance: 150,
        nodeOpacity: 0.15,
        edgeOpacity: 0.052,
        radiusMin: 1,
        radiusMax: 1.4,
        speed: 0.024,
      };
    }

    return {
      count: 32,
      linkDistance: 155,
      nodeOpacity: 0.18,
      edgeOpacity: 0.066,
      radiusMin: 1.05,
      radiusMax: 1.55,
      speed: 0.03,
    };
  };

  let settings = settingsForWidth(window.innerWidth);

  const candidatePosition = (existingNodes) => {
    let best = null;
    let bestDistance = -1;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = {
        x: randomBetween(24, Math.max(25, width - 24)),
        y: randomBetween(18, Math.max(19, height - 18)),
      };

      const nearestDistance = existingNodes.reduce((nearest, node) => {
        const distance = Math.hypot(candidate.x - node.x, candidate.y - node.y);
        return Math.min(nearest, distance);
      }, Number.POSITIVE_INFINITY);

      if (nearestDistance > bestDistance) {
        best = candidate;
        bestDistance = nearestDistance;
      }
    }

    return best || { x: Math.random() * width, y: Math.random() * height };
  };

  const createNode = () => {
    const position = candidatePosition(nodes);
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(settings.speed * 0.45, settings.speed);

    return {
      x: position.x,
      y: position.y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      offsetX: 0,
      offsetY: 0,
      offsetVelocityX: 0,
      offsetVelocityY: 0,
      radius: randomBetween(settings.radiusMin, settings.radiusMax),
    };
  };

  const reconcileNodes = () => {
    while (nodes.length > settings.count) nodes.pop();
    while (nodes.length < settings.count) nodes.push(createNode());
  };

  const resizeCanvas = () => {
    const previousWidth = width || document.documentElement.clientWidth;
    const previousHeight = height || window.innerHeight;

    width = document.documentElement.clientWidth;
    height = Math.max(700, Math.min(window.innerHeight * 1.16, 1120));
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    settings = settingsForWidth(width);

    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (nodes.length) {
      const scaleX = width / previousWidth;
      const scaleY = height / previousHeight;
      nodes.forEach((node) => {
        node.x *= scaleX;
        node.y *= scaleY;
        node.radius = Math.min(
          settings.radiusMax,
          Math.max(settings.radiusMin, node.radius),
        );
      });
    }

    reconcileNodes();
    draw();
  };

  const updateNode = (node, frameScale, elapsedMilliseconds) => {
    node.x += node.velocityX * frameScale;
    node.y += node.velocityY * frameScale;

    const margin = 12;
    if (node.x < -margin) node.x = width + margin;
    if (node.x > width + margin) node.x = -margin;
    if (node.y < -margin) node.y = height + margin;
    if (node.y > height + margin) node.y = -margin;

    let targetOffsetX = 0;
    let targetOffsetY = 0;

    if (pointer.active) {
      const deltaX = pointer.x - node.x;
      const deltaY = pointer.y - node.y;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance > 0 && distance < POINTER_RADIUS) {
        const falloff = 1 - distance / POINTER_RADIUS;
        const displacement = 8 * falloff * falloff;
        targetOffsetX = (deltaX / distance) * displacement;
        targetOffsetY = (deltaY / distance) * displacement;
      }
    }

    const force = POINTER_FORCE * Math.min(elapsedMilliseconds, 32);
    node.offsetVelocityX += (targetOffsetX - node.offsetX) * force;
    node.offsetVelocityY += (targetOffsetY - node.offsetY) * force;

    const damping = Math.pow(0.84, frameScale);
    node.offsetVelocityX *= damping;
    node.offsetVelocityY *= damping;
    node.offsetX += node.offsetVelocityX * frameScale;
    node.offsetY += node.offsetVelocityY * frameScale;
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);

    for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
      const first = nodes[firstIndex];
      const firstX = first.x + first.offsetX;
      const firstY = first.y + first.offsetY;

      for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
        const second = nodes[secondIndex];
        const secondX = second.x + second.offsetX;
        const secondY = second.y + second.offsetY;
        const distance = Math.hypot(secondX - firstX, secondY - firstY);

        if (distance >= settings.linkDistance) continue;

        const proximity = 1 - distance / settings.linkDistance;
        const opacity = settings.edgeOpacity * Math.pow(proximity, 1.35);
        context.beginPath();
        context.moveTo(firstX, firstY);
        context.lineTo(secondX, secondY);
        context.lineWidth = 0.65;
        context.strokeStyle = `rgba(${COLOR.join(",")},${opacity})`;
        context.stroke();
      }
    }

    nodes.forEach((node) => {
      context.beginPath();
      context.arc(
        node.x + node.offsetX,
        node.y + node.offsetY,
        node.radius,
        0,
        Math.PI * 2,
      );
      context.fillStyle = `rgba(${COLOR.join(",")},${settings.nodeOpacity})`;
      context.fill();
    });
  };

  const animate = (time) => {
    if (document.hidden || reducedMotion) {
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
    if (animationFrame || document.hidden || reducedMotion) return;
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

  window.addEventListener(
    "resize",
    () => {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        resizeCanvas();
      });
    },
    { passive: true },
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAnimation();
    } else {
      startAnimation();
    }
  });

  const handleMotionPreference = (event) => {
    reducedMotion = event.matches;
    pointer.active = false;

    if (reducedMotion) {
      stopAnimation();
      nodes.forEach((node) => {
        node.offsetX = 0;
        node.offsetY = 0;
        node.offsetVelocityX = 0;
        node.offsetVelocityY = 0;
      });
      draw();
    } else {
      startAnimation();
    }
  };

  if (typeof motionPreference.addEventListener === "function") {
    motionPreference.addEventListener("change", handleMotionPreference);
  } else {
    motionPreference.addListener(handleMotionPreference);
  }

  resizeCanvas();
  startAnimation();
})();
