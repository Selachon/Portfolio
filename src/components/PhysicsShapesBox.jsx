import { useEffect, useRef } from "react";

const SHAPE_CONFIG = [
  {
    id: "circle",
    type: "circle",
    size: 1.03,
    restitution: 0.62,
    friction: 0.18,
    linearDamping: 0.997,
    angularDamping: 0.996,
    spinFactor: 1,
    stableStep: null,
  },
  {
    id: "square",
    type: "square",
    size: 0.95,
    restitution: 0.42,
    friction: 0.42,
    linearDamping: 0.992,
    angularDamping: 0.94,
    spinFactor: 0.08,
    stableStep: Math.PI / 2,
  },
  {
    id: "triangle",
    type: "triangle",
    size: 0.9,
    restitution: 0.4,
    friction: 0.45,
    linearDamping: 0.991,
    angularDamping: 0.936,
    spinFactor: 0.12,
    stableStep: (Math.PI * 2) / 3,
  },
  {
    id: "hex",
    type: "hex",
    size: 0.98,
    restitution: 0.5,
    friction: 0.34,
    linearDamping: 0.994,
    angularDamping: 0.948,
    spinFactor: 0.16,
    stableStep: Math.PI / 3,
  },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function crossVector(a, b) {
  return a.x * b.y - a.y * b.x;
}

function crossScalarVector(scalar, vector) {
  return {
    x: -scalar * vector.y,
    y: scalar * vector.x,
  };
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 0.00001) {
    return { x: 1, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function createRegularPolygonVertices(sides, radius) {
  const vertices = [];

  for (let index = 0; index < sides; index += 1) {
    const angle = -Math.PI / 2 + (index / sides) * Math.PI * 2;
    vertices.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }

  return vertices;
}

function computePolygonInertia(vertices, mass) {
  let areaTwice = 0;
  let inertiaTerm = 0;

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    const cross = Math.abs(crossVector(current, next));
    const sumSquares =
      current.x * current.x +
      current.x * next.x +
      next.x * next.x +
      current.y * current.y +
      current.y * next.y +
      next.y * next.y;

    areaTwice += cross;
    inertiaTerm += cross * sumSquares;
  }

  const area = Math.max(0.0001, areaTwice * 0.5);
  return (mass / (12 * area)) * inertiaTerm;
}

function traceBodyPath(context, body) {
  if (body.shape === "circle") {
    context.beginPath();
    context.arc(0, 0, body.radius, 0, Math.PI * 2);
    context.closePath();
    return;
  }

  const vertices = body.localVertices;
  context.beginPath();
  context.moveTo(vertices[0].x, vertices[0].y);

  for (let index = 1; index < vertices.length; index += 1) {
    context.lineTo(vertices[index].x, vertices[index].y);
  }

  context.closePath();
}

function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const getVar = (name, fallback) => {
    const value = style.getPropertyValue(name).trim();
    return value || fallback;
  };

  return {
    surface: getVar("--bg-elev", "#101623"),
    border: getVar("--border", "rgba(255,255,255,0.18)"),
    line: getVar("--hex-line", "rgba(30, 41, 59, 0.06)"),
    fill: getVar("--hex-fill", "rgba(255, 179, 217, 0.1)"),
    activeStroke: getVar("--hex-active-stroke", "rgba(255, 179, 217, 0.76)"),
    activeGlow: getVar("--hex-active-glow", "rgba(229, 222, 255, 0.5)"),
    colors: [
      getVar("--accent", "#ffb3d9"),
      getVar("--accent-2", "#e5deff"),
      getVar("--success", "#22c59d"),
      getVar("--warning", "#f2ab38"),
    ],
  };
}

function createBodySprite(body, palette) {
  const spritePadding = Math.ceil(body.radius * 1.1 + 6);
  const size = Math.ceil(body.radius * 2 + spritePadding * 2);
  const canvas = document.createElement("canvas");

  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    return { canvas, half: size / 2 };
  }

  const half = size / 2;
  context.translate(half, half);

  context.globalAlpha = 0.18;
  context.fillStyle = body.color;
  traceBodyPath(context, body);
  context.fill();

  context.globalAlpha = 0.26;
  context.fillStyle = palette.fill;
  traceBodyPath(context, body);
  context.fill();

  context.globalAlpha = 0.88;
  context.strokeStyle = palette.line;
  context.lineWidth = 1.25;
  traceBodyPath(context, body);
  context.stroke();

  context.globalAlpha = 0.7;
  context.shadowColor = palette.activeGlow;
  context.shadowBlur = 8;
  context.strokeStyle = palette.activeStroke;
  context.lineWidth = 1.5;
  traceBodyPath(context, body);
  context.stroke();
  context.shadowBlur = 0;

  context.globalAlpha = 0.15;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.ellipse(-body.radius * 0.2, -body.radius * 0.32, body.radius * 0.46, body.radius * 0.32, 0, 0, Math.PI * 2);
  context.fill();

  return { canvas, half };
}

function createBody(config, index, bounds, palette, baseRadius) {
  const radius = baseRadius * config.size;
  const spacing = (bounds.right - bounds.left) / (SHAPE_CONFIG.length + 1);

  let shape = "circle";
  let localVertices = null;

  if (config.type === "square") {
    shape = "polygon";
    localVertices = createRegularPolygonVertices(4, radius * 1.15);
  } else if (config.type === "triangle") {
    shape = "polygon";
    localVertices = createRegularPolygonVertices(3, radius * 1.24);
  } else if (config.type === "hex") {
    shape = "polygon";
    localVertices = createRegularPolygonVertices(6, radius * 1.06);
  }

  const mass = radius * 0.98;
  const inertia =
    shape === "circle"
      ? 0.5 * mass * radius * radius
      : computePolygonInertia(localVertices, mass);

  const body = {
    id: `${config.id}-${index}`,
    type: config.type,
    shape,
    color: palette.colors[index % palette.colors.length],
    radius,
    x: bounds.left + spacing * (index + 1),
    y: bounds.top - radius * (2.1 + index * 0.5),
    vx: (Math.random() - 0.5) * 32,
    vy: 0,
    angle: Math.random() * Math.PI * 2,
    omega: (Math.random() - 0.5) * 0.34,
    mass,
    invMass: mass > 0 ? 1 / mass : 0,
    inertia,
    invInertia: inertia > 0 ? 1 / inertia : 0,
    restitution: config.restitution,
    friction: config.friction,
    linearDamping: config.linearDamping,
    angularDamping: config.angularDamping,
    spinFactor: config.spinFactor,
    stableStep: config.stableStep,
    localVertices,
    worldVertices: localVertices ? localVertices.map(() => ({ x: 0, y: 0 })) : null,
    axes: localVertices ? localVertices.map(() => ({ x: 1, y: 0 })) : null,
    aabb: {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    },
    sleepFrames: 0,
    sleeping: false,
    sprite: null,
  };

  body.sprite = createBodySprite(body, palette);
  return body;
}

function updateBodyGeometry(body) {
  if (body.shape === "circle") {
    body.aabb.minX = body.x - body.radius;
    body.aabb.maxX = body.x + body.radius;
    body.aabb.minY = body.y - body.radius;
    body.aabb.maxY = body.y + body.radius;
    return;
  }

  const cosine = Math.cos(body.angle);
  const sine = Math.sin(body.angle);

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < body.localVertices.length; index += 1) {
    const localVertex = body.localVertices[index];
    const worldVertex = body.worldVertices[index];

    worldVertex.x = body.x + localVertex.x * cosine - localVertex.y * sine;
    worldVertex.y = body.y + localVertex.x * sine + localVertex.y * cosine;

    if (worldVertex.x < minX) minX = worldVertex.x;
    if (worldVertex.y < minY) minY = worldVertex.y;
    if (worldVertex.x > maxX) maxX = worldVertex.x;
    if (worldVertex.y > maxY) maxY = worldVertex.y;
  }

  for (let index = 0; index < body.worldVertices.length; index += 1) {
    const current = body.worldVertices[index];
    const next = body.worldVertices[(index + 1) % body.worldVertices.length];
    const axis = normalize({
      x: -(next.y - current.y),
      y: next.x - current.x,
    });

    body.axes[index].x = axis.x;
    body.axes[index].y = axis.y;
  }

  body.aabb.minX = minX;
  body.aabb.minY = minY;
  body.aabb.maxX = maxX;
  body.aabb.maxY = maxY;
}

function projectBody(body, axis) {
  if (body.shape === "circle") {
    const center = dot({ x: body.x, y: body.y }, axis);
    return {
      min: center - body.radius,
      max: center + body.radius,
    };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < body.worldVertices.length; index += 1) {
    const projection = dot(body.worldVertices[index], axis);
    if (projection < min) min = projection;
    if (projection > max) max = projection;
  }

  return { min, max };
}

function getSupportPoint(body, direction) {
  if (body.shape === "circle") {
    const axis = normalize(direction);
    return {
      x: body.x + axis.x * body.radius,
      y: body.y + axis.y * body.radius,
    };
  }

  let best = body.worldVertices[0];
  let bestProjection = dot(best, direction);

  for (let index = 1; index < body.worldVertices.length; index += 1) {
    const candidate = body.worldVertices[index];
    const candidateProjection = dot(candidate, direction);

    if (candidateProjection > bestProjection) {
      bestProjection = candidateProjection;
      best = candidate;
    }
  }

  return { x: best.x, y: best.y };
}

function getClosestVertexAxis(circleBody, polygonBody) {
  let closest = polygonBody.worldVertices[0];
  let closestDistanceSq = Number.POSITIVE_INFINITY;

  for (let index = 0; index < polygonBody.worldVertices.length; index += 1) {
    const vertex = polygonBody.worldVertices[index];
    const dx = vertex.x - circleBody.x;
    const dy = vertex.y - circleBody.y;
    const distanceSq = dx * dx + dy * dy;

    if (distanceSq < closestDistanceSq) {
      closestDistanceSq = distanceSq;
      closest = vertex;
    }
  }

  return normalize({
    x: closest.x - circleBody.x,
    y: closest.y - circleBody.y,
  });
}

function detectCircleCircleCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const radiusSum = a.radius + b.radius;
  const distanceSq = dx * dx + dy * dy;

  if (distanceSq >= radiusSum * radiusSum) {
    return null;
  }

  const distance = Math.max(0.0001, Math.sqrt(distanceSq));
  const normal = {
    x: dx / distance,
    y: dy / distance,
  };

  const contact = {
    x: a.x + normal.x * a.radius,
    y: a.y + normal.y * a.radius,
  };

  return {
    normal,
    penetration: radiusSum - distance,
    contact,
  };
}

function detectCirclePolygonCollision(circleBody, polygonBody) {
  let smallestOverlap = Number.POSITIVE_INFINITY;
  let smallestAxis = null;

  const axes = [...polygonBody.axes, getClosestVertexAxis(circleBody, polygonBody)];

  for (let index = 0; index < axes.length; index += 1) {
    const axis = axes[index];
    const projectionCircle = projectBody(circleBody, axis);
    const projectionPolygon = projectBody(polygonBody, axis);
    const overlap = Math.min(projectionCircle.max, projectionPolygon.max) - Math.max(projectionCircle.min, projectionPolygon.min);

    if (overlap <= 0) {
      return null;
    }

    if (overlap < smallestOverlap) {
      smallestOverlap = overlap;
      smallestAxis = axis;
    }
  }

  const centerDelta = {
    x: polygonBody.x - circleBody.x,
    y: polygonBody.y - circleBody.y,
  };

  let normal = { ...smallestAxis };
  if (dot(centerDelta, normal) < 0) {
    normal = { x: -normal.x, y: -normal.y };
  }

  const circlePoint = {
    x: circleBody.x + normal.x * circleBody.radius,
    y: circleBody.y + normal.y * circleBody.radius,
  };
  const polygonPoint = getSupportPoint(polygonBody, { x: -normal.x, y: -normal.y });

  return {
    normal,
    penetration: smallestOverlap,
    contact: {
      x: (circlePoint.x + polygonPoint.x) * 0.5,
      y: (circlePoint.y + polygonPoint.y) * 0.5,
    },
  };
}

function detectPolygonPolygonCollision(a, b) {
  let smallestOverlap = Number.POSITIVE_INFINITY;
  let smallestAxis = null;

  const axes = [...a.axes, ...b.axes];

  for (let index = 0; index < axes.length; index += 1) {
    const axis = axes[index];
    const projectionA = projectBody(a, axis);
    const projectionB = projectBody(b, axis);
    const overlap = Math.min(projectionA.max, projectionB.max) - Math.max(projectionA.min, projectionB.min);

    if (overlap <= 0) {
      return null;
    }

    if (overlap < smallestOverlap) {
      smallestOverlap = overlap;
      smallestAxis = axis;
    }
  }

  const centerDelta = {
    x: b.x - a.x,
    y: b.y - a.y,
  };

  let normal = { ...smallestAxis };
  if (dot(centerDelta, normal) < 0) {
    normal = { x: -normal.x, y: -normal.y };
  }

  const supportA = getSupportPoint(a, normal);
  const supportB = getSupportPoint(b, { x: -normal.x, y: -normal.y });

  return {
    normal,
    penetration: smallestOverlap,
    contact: {
      x: (supportA.x + supportB.x) * 0.5,
      y: (supportA.y + supportB.y) * 0.5,
    },
  };
}

function detectCollision(a, b) {
  if (a.shape === "circle" && b.shape === "circle") {
    return detectCircleCircleCollision(a, b);
  }

  if (a.shape === "circle" && b.shape === "polygon") {
    return detectCirclePolygonCollision(a, b);
  }

  if (a.shape === "polygon" && b.shape === "circle") {
    const collision = detectCirclePolygonCollision(b, a);
    if (!collision) return null;

    return {
      normal: {
        x: -collision.normal.x,
        y: -collision.normal.y,
      },
      penetration: collision.penetration,
      contact: collision.contact,
    };
  }

  return detectPolygonPolygonCollision(a, b);
}

function solveStaticOrientation(body, dt, force = false) {
  if (!body.stableStep) return;

  const targetAngle = Math.round(body.angle / body.stableStep) * body.stableStep;
  const delta = targetAngle - body.angle;
  const strength = force ? 16 : 10;

  body.angle += delta * Math.min(1, dt * strength);

  if (Math.abs(delta) < 0.008 && Math.abs(body.vx) < 24 && Math.abs(body.vy) < 16) {
    body.angle = targetAngle;
    body.omega = 0;
  }
}

function resolveCollision(a, b, collision) {
  const inverseMassSum = a.invMass + b.invMass;
  if (inverseMassSum <= 0) return;

  const correctionSlop = 0.2;
  const correctionPercent = 0.7;
  const correctionMagnitude =
    (Math.max(collision.penetration - correctionSlop, 0) / inverseMassSum) * correctionPercent;

  a.x -= collision.normal.x * correctionMagnitude * a.invMass;
  a.y -= collision.normal.y * correctionMagnitude * a.invMass;
  b.x += collision.normal.x * correctionMagnitude * b.invMass;
  b.y += collision.normal.y * correctionMagnitude * b.invMass;

  const ra = {
    x: collision.contact.x - a.x,
    y: collision.contact.y - a.y,
  };
  const rb = {
    x: collision.contact.x - b.x,
    y: collision.contact.y - b.y,
  };

  const velocityA = {
    x: a.vx + crossScalarVector(a.omega, ra).x,
    y: a.vy + crossScalarVector(a.omega, ra).y,
  };
  const velocityB = {
    x: b.vx + crossScalarVector(b.omega, rb).x,
    y: b.vy + crossScalarVector(b.omega, rb).y,
  };

  const relativeVelocity = {
    x: velocityB.x - velocityA.x,
    y: velocityB.y - velocityA.y,
  };

  const velocityAlongNormal = dot(relativeVelocity, collision.normal);
  if (velocityAlongNormal > 0) {
    return;
  }

  const raCrossNormal = crossVector(ra, collision.normal);
  const rbCrossNormal = crossVector(rb, collision.normal);

  const impulseDenominator =
    a.invMass +
    b.invMass +
    raCrossNormal * raCrossNormal * a.invInertia +
    rbCrossNormal * rbCrossNormal * b.invInertia;

  if (impulseDenominator <= 0) return;

  const restitution = Math.min(a.restitution, b.restitution);
  const normalImpulseMagnitude = (-(1 + restitution) * velocityAlongNormal) / impulseDenominator;
  const normalImpulse = {
    x: collision.normal.x * normalImpulseMagnitude,
    y: collision.normal.y * normalImpulseMagnitude,
  };

  a.vx -= normalImpulse.x * a.invMass;
  a.vy -= normalImpulse.y * a.invMass;
  b.vx += normalImpulse.x * b.invMass;
  b.vy += normalImpulse.y * b.invMass;

  a.omega -= crossVector(ra, normalImpulse) * a.invInertia;
  b.omega += crossVector(rb, normalImpulse) * b.invInertia;

  const velocityAAfter = {
    x: a.vx + crossScalarVector(a.omega, ra).x,
    y: a.vy + crossScalarVector(a.omega, ra).y,
  };
  const velocityBAfter = {
    x: b.vx + crossScalarVector(b.omega, rb).x,
    y: b.vy + crossScalarVector(b.omega, rb).y,
  };

  const rvAfter = {
    x: velocityBAfter.x - velocityAAfter.x,
    y: velocityBAfter.y - velocityAAfter.y,
  };

  const tangentCandidate = {
    x: rvAfter.x - collision.normal.x * dot(rvAfter, collision.normal),
    y: rvAfter.y - collision.normal.y * dot(rvAfter, collision.normal),
  };
  const tangentLength = Math.hypot(tangentCandidate.x, tangentCandidate.y);

  if (tangentLength > 0.0001) {
    const tangent = {
      x: tangentCandidate.x / tangentLength,
      y: tangentCandidate.y / tangentLength,
    };

    const raCrossTangent = crossVector(ra, tangent);
    const rbCrossTangent = crossVector(rb, tangent);

    const frictionDenominator =
      a.invMass +
      b.invMass +
      raCrossTangent * raCrossTangent * a.invInertia +
      rbCrossTangent * rbCrossTangent * b.invInertia;

    if (frictionDenominator > 0) {
      let frictionImpulseMagnitude = -dot(rvAfter, tangent) / frictionDenominator;
      const frictionLimit = normalImpulseMagnitude * Math.sqrt(a.friction * b.friction);

      frictionImpulseMagnitude = clamp(frictionImpulseMagnitude, -frictionLimit, frictionLimit);

      const frictionImpulse = {
        x: tangent.x * frictionImpulseMagnitude,
        y: tangent.y * frictionImpulseMagnitude,
      };

      a.vx -= frictionImpulse.x * a.invMass;
      a.vy -= frictionImpulse.y * a.invMass;
      b.vx += frictionImpulse.x * b.invMass;
      b.vy += frictionImpulse.y * b.invMass;

      a.omega -= crossVector(ra, frictionImpulse) * a.invInertia;
      b.omega += crossVector(rb, frictionImpulse) * b.invInertia;
    }
  }

  a.sleeping = false;
  b.sleeping = false;
  a.sleepFrames = 0;
  b.sleepFrames = 0;
}

function pointInPolygon(point, vertices) {
  let inside = false;

  for (let index = 0, previous = vertices.length - 1; index < vertices.length; previous = index, index += 1) {
    const currentVertex = vertices[index];
    const previousVertex = vertices[previous];

    const intersects =
      currentVertex.y > point.y !== previousVertex.y > point.y &&
      point.x <
        ((previousVertex.x - currentVertex.x) * (point.y - currentVertex.y)) /
          (previousVertex.y - currentVertex.y + Number.EPSILON) +
          currentVertex.x;

    if (intersects) inside = !inside;
  }

  return inside;
}

export default function PhysicsShapesBox({ hint, variant = "panel" }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!context) return undefined;

    const isLayer = variant === "layer";
    const fixedStep = 1 / 60;
    const gravity = 1860;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = null;
    let lastFrame = performance.now();
    let accumulator = 0;
    let palette = readPalette();
    let isVisible = !document.hidden;
    let bodies = [];

    const pointer = {
      active: false,
      bodyId: null,
      pointerId: null,
      offsetX: 0,
      offsetY: 0,
      velocityX: 0,
      velocityY: 0,
      lastTime: 0,
    };

    const getBounds = () => {
      if (isLayer) {
        return {
          left: 0,
          right: width,
          top: 0,
          bottom: height,
        };
      }

      const inset = 10;
      return {
        left: inset,
        right: width - inset,
        top: inset,
        bottom: height - inset,
      };
    };

    const getBodyById = (id) => bodies.find((body) => body.id === id) ?? null;

    const hasAwakeBodies = () => bodies.some((body) => !body.sleeping);

    const createBodies = () => {
      const bounds = getBounds();
      const usableWidth = Math.max(300, bounds.right - bounds.left);
      const baseRadius = clamp(usableWidth * 0.06, 16, 32);

      bodies = SHAPE_CONFIG.map((config, index) => createBody(config, index, bounds, palette, baseRadius));

      for (let index = 0; index < bodies.length; index += 1) {
        updateBodyGeometry(bodies[index]);
      }
    };

    const drawScene = () => {
      const bounds = getBounds();

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      if (!isLayer) {
        context.fillStyle = palette.surface;
        context.fillRect(0, 0, width, height);

        context.strokeStyle = palette.border;
        context.lineWidth = 1;
        context.strokeRect(
          Math.floor(bounds.left) + 0.5,
          Math.floor(bounds.top) + 0.5,
          Math.ceil(bounds.right - bounds.left) - 1,
          Math.ceil(bounds.bottom - bounds.top) - 1,
        );
      }

      for (let index = 0; index < bodies.length; index += 1) {
        const body = bodies[index];
        const sprite = body.sprite;
        if (!sprite) continue;

        context.save();
        context.translate(body.x, body.y);
        context.rotate(body.angle);
        context.drawImage(sprite.canvas, -sprite.half, -sprite.half);
        context.restore();
      }
    };

    const resolveWorldBounds = (body, bounds, dt) => {
      if (body.shape === "circle") {
        if (body.x - body.radius < bounds.left) {
          body.x = bounds.left + body.radius;
          if (body.vx < 0) body.vx = -body.vx * body.restitution;
        }

        if (body.x + body.radius > bounds.right) {
          body.x = bounds.right - body.radius;
          if (body.vx > 0) body.vx = -body.vx * body.restitution;
        }

        if (body.y - body.radius < bounds.top) {
          body.y = bounds.top + body.radius;
          if (body.vy < 0) body.vy = -body.vy * body.restitution;
        }

        if (body.y + body.radius > bounds.bottom) {
          body.y = bounds.bottom - body.radius;
          if (body.vy > 0) body.vy = -body.vy * body.restitution;

          body.vx *= 0.992;
          if (Math.abs(body.vy) < 14) body.vy = 0;

          const targetSpin = body.vx / Math.max(8, body.radius);
          body.omega += (targetSpin - body.omega) * 0.14;
        }

        return;
      }

      if (body.aabb.minX < bounds.left) {
        body.x += bounds.left - body.aabb.minX;
        if (body.vx < 0) body.vx = -body.vx * body.restitution;
      }

      if (body.aabb.maxX > bounds.right) {
        body.x -= body.aabb.maxX - bounds.right;
        if (body.vx > 0) body.vx = -body.vx * body.restitution;
      }

      if (body.aabb.minY < bounds.top) {
        body.y += bounds.top - body.aabb.minY;
        if (body.vy < 0) body.vy = -body.vy * body.restitution;
      }

      if (body.aabb.maxY > bounds.bottom) {
        body.y -= body.aabb.maxY - bounds.bottom;
        if (body.vy > 0) body.vy = -body.vy * body.restitution;

        body.vx *= 0.964;
        body.omega *= 0.72;
        solveStaticOrientation(body, dt, true);

        if (Math.abs(body.vy) < 13) body.vy = 0;
      }
    };

    const updateSleepState = (body, bounds) => {
      const speedSquared = body.vx * body.vx + body.vy * body.vy + Math.pow(body.omega * body.radius, 2);
      const touchingFloor = body.aabb.maxY >= bounds.bottom - 0.9;

      if (speedSquared < 210 && touchingFloor && !pointer.active) {
        body.sleepFrames += 1;
        if (body.sleepFrames > 18) {
          body.sleeping = true;
          body.vx = 0;
          body.vy = 0;
          body.omega = 0;

          if (body.stableStep) {
            solveStaticOrientation(body, fixedStep, true);
          }
        }
      } else {
        body.sleepFrames = 0;
        body.sleeping = false;
      }
    };

    const stepPhysics = (dt) => {
      const bounds = getBounds();
      const draggedBody = pointer.active ? getBodyById(pointer.bodyId) : null;

      for (let index = 0; index < bodies.length; index += 1) {
        const body = bodies[index];
        const isDragged = draggedBody && draggedBody.id === body.id;

        if (isDragged || body.sleeping) continue;

        body.vy += gravity * dt;
        body.vx *= body.linearDamping;
        body.vy *= body.linearDamping;
        body.omega *= body.angularDamping;

        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.angle += body.omega * dt;
      }

      for (let index = 0; index < bodies.length; index += 1) {
        updateBodyGeometry(bodies[index]);
      }

      for (let iteration = 0; iteration < 2; iteration += 1) {
        for (let index = 0; index < bodies.length; index += 1) {
          resolveWorldBounds(bodies[index], bounds, dt);
          updateBodyGeometry(bodies[index]);
        }

        for (let leftIndex = 0; leftIndex < bodies.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < bodies.length; rightIndex += 1) {
            const a = bodies[leftIndex];
            const b = bodies[rightIndex];

            if (
              a.aabb.maxX < b.aabb.minX ||
              b.aabb.maxX < a.aabb.minX ||
              a.aabb.maxY < b.aabb.minY ||
              b.aabb.maxY < a.aabb.minY
            ) {
              continue;
            }

            const collision = detectCollision(a, b);
            if (!collision) continue;

            resolveCollision(a, b, collision);
            updateBodyGeometry(a);
            updateBodyGeometry(b);
          }
        }
      }

      for (let index = 0; index < bodies.length; index += 1) {
        updateSleepState(bodies[index], bounds);
      }
    };

    const startLoop = () => {
      if (frame !== null || !isVisible) return;
      lastFrame = performance.now();
      frame = window.requestAnimationFrame(animate);
    };

    const stopLoop = () => {
      if (frame === null) return;
      window.cancelAnimationFrame(frame);
      frame = null;
    };

    const animate = (now) => {
      if (!isVisible) {
        frame = null;
        return;
      }

      const frameTime = clamp((now - lastFrame) / 1000, 0.001, 0.05);
      lastFrame = now;
      accumulator += frameTime;

      let steps = 0;
      while (accumulator >= fixedStep && steps < 3) {
        stepPhysics(fixedStep);
        accumulator -= fixedStep;
        steps += 1;
      }

      drawScene();

      if (pointer.active || hasAwakeBodies()) {
        frame = window.requestAnimationFrame(animate);
      } else {
        frame = null;
      }
    };

    const toCanvasPoint = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * width,
        y: ((event.clientY - rect.top) / rect.height) * height,
      };
    };

    const isPointInsideBody = (point, body) => {
      if (body.shape === "circle") {
        const dx = point.x - body.x;
        const dy = point.y - body.y;
        return dx * dx + dy * dy <= (body.radius + 4) * (body.radius + 4);
      }

      return pointInPolygon(point, body.worldVertices);
    };

    const onPointerDown = (event) => {
      const point = toCanvasPoint(event);

      for (let index = bodies.length - 1; index >= 0; index -= 1) {
        const body = bodies[index];

        if (!isPointInsideBody(point, body)) {
          continue;
        }

        bodies.splice(index, 1);
        bodies.push(body);

        pointer.active = true;
        pointer.bodyId = body.id;
        pointer.pointerId = event.pointerId;
        pointer.offsetX = body.x - point.x;
        pointer.offsetY = body.y - point.y;
        pointer.velocityX = 0;
        pointer.velocityY = 0;
        pointer.lastTime = performance.now();

        body.sleeping = false;
        body.sleepFrames = 0;
        body.vx = 0;
        body.vy = 0;
        body.omega = 0;

        canvas.style.cursor = "grabbing";
        canvas.setPointerCapture(event.pointerId);
        startLoop();
        break;
      }
    };

    const onPointerMove = (event) => {
      if (!pointer.active) return;

      const body = getBodyById(pointer.bodyId);
      if (!body) return;

      const bounds = getBounds();
      const point = toCanvasPoint(event);
      const now = performance.now();
      const dt = Math.max(0.001, (now - pointer.lastTime) / 1000);

      const nextX = clamp(point.x + pointer.offsetX, bounds.left + body.radius, bounds.right - body.radius);
      const nextY = clamp(point.y + pointer.offsetY, bounds.top + body.radius, bounds.bottom - body.radius);

      pointer.velocityX = (nextX - body.x) / dt;
      pointer.velocityY = (nextY - body.y) / dt;
      pointer.lastTime = now;

      body.x = nextX;
      body.y = nextY;
      body.vx = pointer.velocityX * 0.14;
      body.vy = pointer.velocityY * 0.14;
      body.omega = pointer.velocityX * 0.0016 * body.spinFactor;
      body.sleeping = false;
      body.sleepFrames = 0;

      updateBodyGeometry(body);
    };

    const releasePointer = () => {
      if (!pointer.active) return;

      const body = getBodyById(pointer.bodyId);
      if (body) {
        body.vx = clamp(pointer.velocityX * 0.88, -1200, 1200);
        body.vy = clamp(pointer.velocityY * 0.88, -1200, 1200);
        body.omega += (body.vx / Math.max(8, body.radius)) * 0.1 * body.spinFactor;
        body.sleeping = false;
        body.sleepFrames = 0;
      }

      pointer.active = false;
      pointer.bodyId = null;
      pointer.pointerId = null;
      canvas.style.cursor = "grab";
      startLoop();
    };

    const onPointerUp = () => {
      releasePointer();
    };

    const onPointerCancel = () => {
      releasePointer();
    };

    const onMouseLeave = () => {
      if (!pointer.active) {
        canvas.style.cursor = "grab";
      }
    };

    const onVisibilityChange = () => {
      isVisible = !document.hidden;

      if (!isVisible) {
        stopLoop();
      } else {
        drawScene();
        if (pointer.active || hasAwakeBodies()) {
          startLoop();
        }
      }
    };

    const rebuildSprites = () => {
      for (let index = 0; index < bodies.length; index += 1) {
        const body = bodies[index];
        body.color = palette.colors[index % palette.colors.length];
        body.sprite = createBodySprite(body, palette);
      }
    };

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, isLayer ? 1 : 1.5);

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      createBodies();
      drawScene();
      startLoop();
    };

    resize();

    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
      rebuildSprites();
      drawScene();
      if (pointer.active || hasAwakeBodies()) {
        startLoop();
      }
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
    }

    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      themeObserver.disconnect();
      resizeObserver?.disconnect();
      stopLoop();
    };
  }, [variant]);

  const isLayer = variant === "layer";

  return (
    <div
      ref={containerRef}
      style={
        isLayer
          ? {
              position: "absolute",
              inset: 0,
              zIndex: 1,
            }
          : {
              position: "relative",
              width: "100%",
              height: "clamp(150px, 21vh, 210px)",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--border)",
            }
      }
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
          cursor: "grab",
          userSelect: "none",
        }}
      />

      {hint && !isLayer ? (
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <span
            className="pill"
            style={{
              fontSize: 12,
              color: "var(--muted)",
              borderColor: "color-mix(in srgb, var(--accent) 22%, var(--border))",
              background: "color-mix(in srgb, var(--bg-elev) 86%, transparent)",
            }}
          >
            {hint}
          </span>
        </div>
      ) : null}
    </div>
  );
}
