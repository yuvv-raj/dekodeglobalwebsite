import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Line, RoundedBox } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';
import { NARRATIVE_SCENES } from '../utils/narrativeVisual.js';

const methodologyStages = ['Discovery', 'Prototype', 'Design', 'Build', 'Deploy', 'Evolve'];
const starPrinciples = ['Simple', 'Transparent', 'Accountable', 'Reliable'];

const sceneLabels = (scene) => {
  if (scene.id === NARRATIVE_SCENES.STAR) return starPrinciples;
  if (scene.id === NARRATIVE_SCENES.BRIDGE) return ['Australia', 'BRIDGE', 'India'];
  if (scene.id === NARRATIVE_SCENES.METHODOLOGY) return methodologyStages;
  if (scene.id === NARRATIVE_SCENES.CALENDAR) return ['Date', 'Time zone', 'Confirmed'];
  if (scene.id === NARRATIVE_SCENES.PORTFOLIO) return ['Case studies', 'Products', 'Outcomes'];
  if (scene.id === NARRATIVE_SCENES.SECURITY) return ['Identity', 'Data', 'Delivery'];
  if (scene.id === NARRATIVE_SCENES.AI) return ['Context', 'Reasoning', 'Action'];
  if (scene.id === NARRATIVE_SCENES.AUTOMATION) return ['Trigger', 'Flow', 'Outcome'];
  if (scene.features.length) return scene.features.slice(0, 4);
  return ['Problem', 'Structure', 'Useful outcome'];
};

const makeRng = (seed) => {
  let value = Math.max(1, Number(seed) || 1);
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
};

function SceneRig({ children, reducedMotion }) {
  const group = useRef();
  useFrame((state, delta) => {
    if (!group.current || reducedMotion) return;
    const targetX = state.pointer.y * 0.08;
    const targetY = state.pointer.x * 0.14 + Math.sin(state.clock.elapsedTime * 0.22) * 0.04;
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 3, delta);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetY, 3, delta);
  });
  return <group ref={group}>{children}</group>;
}

function AmbientParticles({ accent, seed, reducedMotion }) {
  const group = useRef();
  const points = useMemo(() => {
    const random = makeRng(seed);
    return Array.from({ length: 18 }, () => [
      (random() - 0.5) * 7,
      (random() - 0.5) * 4.4,
      (random() - 0.5) * 2.8 - 0.8,
      0.018 + random() * 0.035,
    ]);
  }, [seed]);
  useFrame((state) => {
    if (group.current && !reducedMotion) group.current.rotation.z = state.clock.elapsedTime * 0.018;
  });
  return (
    <group ref={group}>
      {points.map(([x, y, z, scale], index) => (
        <mesh key={`${x}-${index}`} position={[x, y, z]} scale={scale}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={accent} transparent opacity={0.52} />
        </mesh>
      ))}
    </group>
  );
}

function PulseNode({ position, color, scale = 0.13, delay = 0, reducedMotion }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current || reducedMotion) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.2 + delay) * 0.16;
    ref.current.scale.setScalar(pulse);
  });
  return (
    <group position={position}>
      <mesh ref={ref} scale={scale}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} roughness={0.25} />
      </mesh>
      <mesh scale={scale * 1.45}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CurveTraveller({ curve, color, offset = 0, speed = 0.12, reducedMotion }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const time = reducedMotion ? offset : (state.clock.elapsedTime * speed + offset) % 1;
    ref.current.position.copy(curve.getPointAt(time));
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.065, 14, 14]} />
      <meshBasicMaterial color={color} toneMapped={false} />
      <pointLight color={color} intensity={0.8} distance={1.2} />
    </mesh>
  );
}

function BridgeScene({ scene, reducedMotion }) {
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-2.15, -0.25, 0),
    new THREE.Vector3(0, 1.35, 0),
    new THREE.Vector3(2.15, -0.25, 0),
  ), []);
  const bridgePoints = useMemo(() => Array.from({ length: 17 }, (_, index) => curve.getPoint(index / 16)), [curve]);
  return (
    <SceneRig reducedMotion={reducedMotion}>
      <group position={[0, -0.15, 0]}>
        {[-2.35, 2.35].map((x, index) => (
          <group key={x} position={[x, -0.45, 0]}>
            <RoundedBox args={[1.05, 0.18, 0.74]} radius={0.08}>
              <meshStandardMaterial color={index ? scene.secondary : scene.accent} roughness={0.7} metalness={0.1} />
            </RoundedBox>
            <mesh position={[0, 0.28, 0]}>
              <cylinderGeometry args={[0.035, 0.055, 0.48, 12]} />
              <meshStandardMaterial color={index ? scene.secondary : scene.accent} emissive={index ? scene.secondary : scene.accent} emissiveIntensity={0.55} />
            </mesh>
          </group>
        ))}
        <Line points={bridgePoints} color={scene.accent} lineWidth={1.7} transparent opacity={0.72} />
        {bridgePoints.map((point, index) => index % 2 === 0 && (
          <RoundedBox key={index} args={[0.24, 0.07, 0.48]} radius={0.03} position={point.toArray()}>
            <meshStandardMaterial color={index < 8 ? scene.accent : scene.secondary} emissive={index < 8 ? scene.accent : scene.secondary} emissiveIntensity={0.32} />
          </RoundedBox>
        ))}
        {[0, 0.28, 0.56].map((offset) => (
          <CurveTraveller key={offset} curve={curve} color={offset === 0.28 ? scene.secondary : '#ffffff'} offset={offset} reducedMotion={reducedMotion} />
        ))}
      </group>
    </SceneRig>
  );
}

function StarScene({ scene, reducedMotion }) {
  const group = useRef();
  useFrame((state) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.17;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.25) * 0.08;
  });
  const rotations = [[Math.PI / 2, 0, 0], [0, Math.PI / 2, 0], [0.65, 0.5, 0], [-0.65, 0.5, 0]];
  return (
    <SceneRig reducedMotion={reducedMotion}>
      <group ref={group}>
        <mesh>
          <icosahedronGeometry args={[1.08, 3]} />
          <meshPhysicalMaterial color="#dbeafe" transparent opacity={0.12} roughness={0.1} metalness={0.45} transmission={0.35} wireframe />
        </mesh>
        <mesh scale={0.76}>
          <sphereGeometry args={[1, 36, 36]} />
          <meshStandardMaterial color={scene.accent} emissive={scene.accent} emissiveIntensity={0.24} transparent opacity={0.26} />
        </mesh>
        {rotations.map((rotation, index) => (
          <group key={starPrinciples[index]} rotation={rotation}>
            <mesh>
              <torusGeometry args={[1.45 + index * 0.08, 0.018, 10, 96]} />
              <meshBasicMaterial color={index % 2 ? scene.secondary : scene.accent} transparent opacity={0.64} />
            </mesh>
            <PulseNode position={[1.45 + index * 0.08, 0, 0]} color={index % 2 ? scene.secondary : scene.accent} scale={0.075} delay={index} reducedMotion={reducedMotion} />
          </group>
        ))}
      </group>
    </SceneRig>
  );
}

function MethodologyScene({ scene, reducedMotion }) {
  const points = useMemo(() => methodologyStages.map((_, index) => {
    const angle = -Math.PI * 0.82 + index * (Math.PI * 1.64 / 5);
    return new THREE.Vector3(Math.cos(angle) * 2.05, Math.sin(angle) * 1.15, (index - 2.5) * 0.08);
  }), []);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  return (
    <SceneRig reducedMotion={reducedMotion}>
      <Line points={curve.getPoints(80)} color={scene.accent} lineWidth={1.5} transparent opacity={0.5} />
      {points.map((position, index) => (
        <PulseNode key={methodologyStages[index]} position={position.toArray()} color={index <= scene.progress - 1 ? scene.accent : scene.secondary} delay={index * 0.7} reducedMotion={reducedMotion} />
      ))}
      <CurveTraveller curve={curve} color="#ffffff" speed={0.1} reducedMotion={reducedMotion} />
    </SceneRig>
  );
}

function ProductBuildScene({ scene, reducedMotion }) {
  const blocks = useMemo(() => {
    const random = makeRng(scene.seed);
    const count = Math.min(9, 4 + scene.progress + scene.features.length);
    return Array.from({ length: count }, (_, index) => ({
      position: [((index % 3) - 1) * 0.72, -0.55 + Math.floor(index / 3) * 0.55, (random() - 0.5) * 0.42],
      scale: [0.58 + random() * 0.18, 0.36 + random() * 0.14, 0.42],
    }));
  }, [scene.features.length, scene.progress, scene.seed]);
  return (
    <SceneRig reducedMotion={reducedMotion}>
      <group position={[0, -0.2, 0]}>
        <RoundedBox args={[3.7, 0.14, 2.2]} radius={0.08} position={[0, -1, 0]}>
          <meshStandardMaterial color="#0b2036" metalness={0.35} roughness={0.55} />
        </RoundedBox>
        {blocks.map((block, index) => (
          <Float key={index} speed={reducedMotion ? 0 : 1 + index * 0.04} rotationIntensity={reducedMotion ? 0 : 0.05} floatIntensity={reducedMotion ? 0 : 0.08}>
            <RoundedBox args={block.scale} radius={0.07} position={block.position}>
              <meshStandardMaterial
                color={index % 3 === 0 ? scene.secondary : scene.accent}
                emissive={index % 3 === 0 ? scene.secondary : scene.accent}
                emissiveIntensity={0.12 + index * 0.015}
                roughness={0.35}
                metalness={0.22}
              />
            </RoundedBox>
          </Float>
        ))}
        <Line points={[[-1.6, -0.88, 0.5], [0, -0.88, 0.5], [1.6, -0.88, 0.5]]} color={scene.accent} lineWidth={1.2} transparent opacity={0.45} />
      </group>
    </SceneRig>
  );
}

function NetworkScene({ scene, reducedMotion, mode = 'ai' }) {
  const nodes = useMemo(() => {
    const random = makeRng(scene.seed);
    return Array.from({ length: mode === 'portfolio' ? 7 : 9 }, (_, index) => {
      const angle = index / (mode === 'portfolio' ? 7 : 9) * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(angle) * (1.45 + random() * 0.45),
        Math.sin(angle) * (0.85 + random() * 0.35),
        (random() - 0.5) * 0.7,
      );
    });
  }, [mode, scene.seed]);
  const group = useRef();
  useFrame((state) => {
    if (group.current && !reducedMotion) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.16;
  });
  return (
    <SceneRig reducedMotion={reducedMotion}>
      <group ref={group}>
        {nodes.map((position, index) => (
          <React.Fragment key={index}>
            <Line points={[[0, 0, 0], position.toArray()]} color={index % 2 ? scene.secondary : scene.accent} lineWidth={0.8} transparent opacity={0.28} />
            {mode === 'portfolio' ? (
              <Float speed={reducedMotion ? 0 : 1.2} floatIntensity={reducedMotion ? 0 : 0.18}>
                <RoundedBox args={[0.52, 0.72, 0.08]} radius={0.06} position={position.toArray()}>
                  <meshStandardMaterial color={index % 2 ? scene.secondary : scene.accent} emissive={index % 2 ? scene.secondary : scene.accent} emissiveIntensity={0.18} />
                </RoundedBox>
              </Float>
            ) : (
              <PulseNode position={position.toArray()} color={index % 2 ? scene.secondary : scene.accent} delay={index} reducedMotion={reducedMotion} />
            )}
          </React.Fragment>
        ))}
        <mesh>
          {mode === 'cloud' ? <octahedronGeometry args={[0.72, 2]} /> : <icosahedronGeometry args={[0.68, 2]} />}
          <meshStandardMaterial color={scene.accent} emissive={scene.accent} emissiveIntensity={0.7} wireframe={mode !== 'portfolio'} transparent opacity={0.82} />
        </mesh>
      </group>
    </SceneRig>
  );
}

function AutomationScene({ scene, reducedMotion }) {
  const lanes = [-0.72, 0, 0.72];
  return (
    <SceneRig reducedMotion={reducedMotion}>
      {lanes.map((y, lane) => {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-2.3, y, 0),
          new THREE.Vector3(-0.8, y + (lane - 1) * 0.18, 0.1),
          new THREE.Vector3(0.65, y - (lane - 1) * 0.12, 0),
          new THREE.Vector3(2.3, y, 0),
        ]);
        return (
          <group key={y}>
            <Line points={curve.getPoints(50)} color={lane === 1 ? scene.secondary : scene.accent} lineWidth={1.3} transparent opacity={0.45} />
            <CurveTraveller curve={curve} color={lane === 1 ? scene.secondary : '#ffffff'} offset={lane * 0.24} speed={0.15} reducedMotion={reducedMotion} />
            {[-1.4, 0, 1.4].map((x, index) => (
              <RoundedBox key={x} args={[0.34, 0.34, 0.34]} radius={0.06} position={[x, y, 0]}>
                <meshStandardMaterial color={index === 2 ? scene.secondary : scene.accent} emissive={scene.accent} emissiveIntensity={0.15} />
              </RoundedBox>
            ))}
          </group>
        );
      })}
    </SceneRig>
  );
}

function SecurityScene({ scene, reducedMotion }) {
  const group = useRef();
  useFrame((state) => {
    if (group.current && !reducedMotion) group.current.rotation.y = state.clock.elapsedTime * 0.15;
  });
  return (
    <SceneRig reducedMotion={reducedMotion}>
      <group ref={group}>
        {[1.05, 1.42, 1.78].map((scale, index) => (
          <mesh key={scale} scale={scale} rotation={[index * 0.38, index * 0.48, index * 0.22]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial color={index === 1 ? scene.secondary : scene.accent} wireframe transparent opacity={0.48 - index * 0.09} />
          </mesh>
        ))}
        <mesh scale={0.68}>
          <octahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={scene.accent} emissive={scene.accent} emissiveIntensity={0.72} roughness={0.25} />
        </mesh>
      </group>
    </SceneRig>
  );
}

function CalendarScene({ scene, reducedMotion, bookingComplete }) {
  const tiles = Array.from({ length: 20 });
  const active = bookingComplete ? 18 : 7 + (scene.seed % 8);
  return (
    <SceneRig reducedMotion={reducedMotion}>
      <group rotation={[-0.55, 0.08, 0]} position={[0, -0.12, 0]}>
        {tiles.map((_, index) => {
          const x = (index % 5 - 2) * 0.62;
          const y = (1.5 - Math.floor(index / 5)) * 0.55;
          const selected = index === active;
          return (
            <RoundedBox key={index} args={[0.46, 0.38, selected ? 0.19 : 0.08]} radius={0.07} position={[x, y, selected ? 0.16 : 0]}>
              <meshStandardMaterial color={selected ? scene.secondary : scene.accent} emissive={selected ? scene.secondary : scene.accent} emissiveIntensity={selected ? 0.85 : 0.12} transparent opacity={selected ? 1 : 0.48} />
            </RoundedBox>
          );
        })}
      </group>
      <mesh position={[1.75, 0.95, 0.3]}>
        <torusGeometry args={[0.38, 0.025, 12, 64]} />
        <meshBasicMaterial color={scene.secondary} />
      </mesh>
      <Line points={[[1.75, 0.95, 0.3], [1.75, 1.17, 0.3]]} color="#ffffff" lineWidth={1.4} />
      <Line points={[[1.75, 0.95, 0.3], [1.95, 0.87, 0.3]]} color="#ffffff" lineWidth={1.4} />
    </SceneRig>
  );
}

function NarrativeScene({ scene, reducedMotion, bookingComplete }) {
  if (scene.id === NARRATIVE_SCENES.BRIDGE) return <BridgeScene scene={scene} reducedMotion={reducedMotion} />;
  if (scene.id === NARRATIVE_SCENES.STAR) return <StarScene scene={scene} reducedMotion={reducedMotion} />;
  if (scene.id === NARRATIVE_SCENES.METHODOLOGY) return <MethodologyScene scene={scene} reducedMotion={reducedMotion} />;
  if (scene.id === NARRATIVE_SCENES.AUTOMATION) return <AutomationScene scene={scene} reducedMotion={reducedMotion} />;
  if (scene.id === NARRATIVE_SCENES.SECURITY || scene.id === NARRATIVE_SCENES.BOUNDARY) return <SecurityScene scene={scene} reducedMotion={reducedMotion} />;
  if (scene.id === NARRATIVE_SCENES.CALENDAR) return <CalendarScene scene={scene} reducedMotion={reducedMotion} bookingComplete={bookingComplete} />;
  if (scene.id === NARRATIVE_SCENES.AI) return <NetworkScene scene={scene} reducedMotion={reducedMotion} mode="ai" />;
  if (scene.id === NARRATIVE_SCENES.CLOUD || scene.id === NARRATIVE_SCENES.COMPANY) return <NetworkScene scene={scene} reducedMotion={reducedMotion} mode="cloud" />;
  if (scene.id === NARRATIVE_SCENES.PORTFOLIO) return <NetworkScene scene={scene} reducedMotion={reducedMotion} mode="portfolio" />;
  return <ProductBuildScene scene={scene} reducedMotion={reducedMotion} />;
}

export default function NarrativeVisualPanel({ scene, bookingComplete = false }) {
  const reducedMotion = useReducedMotion();
  const labels = sceneLabels(scene);

  return (
    <section
      className={`narrative-visual narrative-scene-${scene.id}`}
      aria-label={`${scene.title}. ${scene.caption}`}
    >
      <div className="narrative-canvas" role="img" aria-label={scene.caption}>
        <Canvas
          camera={{ position: [0, 0, 5.6], fov: 43 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          frameloop={reducedMotion ? 'demand' : 'always'}
          fallback={<div className="narrative-webgl-fallback" aria-hidden="true" />}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 5]} intensity={1.4} color="#ffffff" />
          <pointLight position={[-3, -2, 3]} intensity={1.1} color={scene.accent} />
          <pointLight position={[3, 1, 2]} intensity={0.8} color={scene.secondary} />
          <AmbientParticles accent={scene.accent} seed={scene.seed} reducedMotion={reducedMotion} />
          <NarrativeScene scene={scene} reducedMotion={reducedMotion} bookingComplete={bookingComplete} />
        </Canvas>
      </div>
      <div className="narrative-copy">
        <span>{scene.caption}</span>
      </div>
      <div className="narrative-labels" aria-label="Visual themes">
        {labels.map((label, index) => (
          <span key={label} style={{ '--label-accent': index % 2 ? scene.secondary : scene.accent }}>
            <i aria-hidden="true" />{label}
          </span>
        ))}
      </div>
    </section>
  );
}
