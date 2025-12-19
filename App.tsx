
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Text, useFont } from '@react-three/drei';
import * as THREE from 'three';
import { ALL_IDIOMS } from './data/idioms';
import { Idiom, GameState, FloatingText, WorldMonster, GameMode, WrongRecord, WorldProp } from './types';
import { Button } from './components/Button';
import { HealthBar } from './components/HealthBar';
import { FloatingTextDisplay } from './components/FloatingTextDisplay';
import { Sword, Trophy, Zap, RefreshCw, Skull, Map as MapIcon, Compass, BookOpen, X, List, ArrowLeftRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2, Library, LogOut, Users, Swords, Link as LinkIcon, AlertCircle, Loader2, FileJson, Copy, Check, Sparkles, Gamepad2, History, Timer } from 'lucide-react';

// -----------------------------------------------------------------------------
// Constants & Configuration
// -----------------------------------------------------------------------------

const WORLD_SIZE = 200;
const MOVEMENT_SPEED = 15;
const ROTATION_SPEED = 3; 
const INTERACTION_DISTANCE = 8;
const PLAYER_MAX_HP = 100;
const MONSTER_HP = 40;

const MONSTER_COLORS = [
  '#ef4444', 
  '#f97316', 
  '#eab308', 
  '#84cc16', 
  '#06b6d4', 
  '#8b5cf6', 
  '#d946ef', 
  '#f43f5e', 
];

const EXAMPLE_JSON_CONTENT = `[
  {
    "word": "下落不明",
    "definition": "不知去處,毫無信息。",
    "example": "自從那場大地震後，他便下落不明，家人至今仍未放棄尋找他的希望。"
  },
  {
    "word": "丟三落四",
    "definition": "形容人因為馬虎或健忘,不是忘了這個,就是忘了那個。",
    "example": "出門前請檢查隨身物品，別老是丟三落四，到了學校才發現課本沒帶。"
  },
  {
    "word": "水落石出",
    "definition": "1. 冬季水位下降,使石頭顯露出來。2. 比喻事情真相大白。",
    "example": "經過警方連日來的抽絲剝繭，這起離奇的案件終於水落石出，真相大白。"
  }
]`;

// -----------------------------------------------------------------------------
// Components: 3D Models & Effects
// -----------------------------------------------------------------------------

const VictorySpotlights: React.FC = () => {
  const light1 = useRef<THREE.SpotLight>(null);
  const light2 = useRef<THREE.SpotLight>(null);
  const target1 = useRef<THREE.Object3D>(new THREE.Object3D());
  const target2 = useRef<THREE.Object3D>(new THREE.Object3D());

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (light1.current && light2.current) {
      target1.current.position.set(Math.sin(t * 1.5) * 30, 0, Math.cos(t * 1.5) * 30);
      target2.current.position.set(Math.cos(t * 1.2) * 35, 0, Math.sin(t * 1.2) * 35);
      light1.current.color.setHSL((t * 0.1) % 1, 1, 0.5);
      light2.current.color.setHSL((t * 0.1 + 0.5) % 1, 1, 0.5);
    }
  });

  return (
    <>
      <primitive object={target1.current} />
      <primitive object={target2.current} />
      <spotLight 
        ref={light1} 
        position={[0, 60, 0]} 
        intensity={800} 
        angle={0.25} 
        penumbra={0.5} 
        target={target1.current} 
        castShadow
      />
      <spotLight 
        ref={light2} 
        position={[0, 60, 0]} 
        intensity={800} 
        angle={0.25} 
        penumbra={0.5} 
        target={target2.current} 
        castShadow
      />
    </>
  );
};

const Cheerleader: React.FC<{ 
  position: THREE.Vector3, 
  rotation: number, 
  delay: number,
  isDancing: boolean 
}> = ({ position, rotation, delay, isDancing }) => {
  const group = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (group.current) {
      const t = state.clock.getElapsedTime() * 6 + delay;
      if (isDancing) {
        group.current.position.y = position.y + Math.max(0, Math.sin(t) * 2.5);
        if (armL.current && armR.current) {
          const armSpeed = t * 1.5;
          armL.current.rotation.z = Math.sin(armSpeed) * 1.5 + 1;
          armR.current.rotation.z = -Math.sin(armSpeed) * 1.5 - 1;
          armL.current.rotation.x = Math.cos(armSpeed * 0.5) * 1;
          armR.current.rotation.x = Math.cos(armSpeed * 0.5) * 1;
        }
        if (legL.current && legR.current) {
          legL.current.rotation.z = Math.max(0, Math.sin(t) * 0.8);
          legR.current.rotation.z = Math.min(0, -Math.sin(t) * 0.8);
        }
        if (body.current) {
          body.current.rotation.z = Math.sin(t * 0.5) * 0.3;
        }
      } else {
        group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, position.y, 0.15);
      }
      const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      group.current.quaternion.slerp(targetQuat, 0.15);
      group.current.position.x = position.x;
      group.current.position.z = position.z;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={body} position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[1.2, 1.8, 0.8]} />
        <meshStandardMaterial color="#f472b6" /> 
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.7, 1.5, 0.8, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0, 3.8, 0]} castShadow>
        <boxGeometry args={[1.1, 1.1, 1.1]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
      <group position={[0, 4.2, -0.4]}>
        <mesh castShadow><boxGeometry args={[1.2, 0.5, 0.6]} /><meshStandardMaterial color="#fbbf24" /></mesh>
        <mesh position={[0, -0.6, -0.5]} rotation={[0.5, 0, 0]}><boxGeometry args={[0.4, 1.4, 0.3]} /><meshStandardMaterial color="#fbbf24" /></mesh>
      </group>
      <group ref={armL} position={[-0.8, 3.2, 0]}>
        <mesh position={[-0.3, -0.5, 0]} castShadow><boxGeometry args={[0.4, 1.4, 0.4]} /><meshStandardMaterial color="#ffdbac" /></mesh>
        <mesh position={[-0.4, -1.3, 0]}><sphereGeometry args={[0.8, 16, 16]} /><meshStandardMaterial color="#fcd34d" emissive="#f59e0b" emissiveIntensity={1.5} /></mesh>
      </group>
      <group ref={armR} position={[0.8, 3.2, 0]}>
        <mesh position={[0.3, -0.5, 0]} castShadow><boxGeometry args={[0.4, 1.4, 0.4]} /><meshStandardMaterial color="#ffdbac" /></mesh>
        <mesh position={[0.4, -1.3, 0]}><sphereGeometry args={[0.8, 16, 16]} /><meshStandardMaterial color="#fcd34d" emissive="#f59e0b" emissiveIntensity={1.5} /></mesh>
      </group>
      <group ref={legL} position={[-0.35, 1.2, 0]}><mesh position={[0, -0.6, 0]} castShadow><boxGeometry args={[0.5, 1.2, 0.5]} /><meshStandardMaterial color="#ffdbac" /></mesh></group>
      <group ref={legR} position={[0.35, 1.2, 0]}><mesh position={[0, -0.6, 0]} castShadow><boxGeometry args={[0.5, 1.2, 0.5]} /><meshStandardMaterial color="#ffdbac" /></mesh></group>
    </group>
  );
};

const CelebrationCheer: React.FC = () => {
  const [descentY, setDescentY] = useState(60);
  const [formationId, setFormationId] = useState(0);
  const currentPosRefs = useRef<THREE.Vector3[]>(
    new Array(8).fill(0).map(() => new THREE.Vector3(0, 60, 0))
  );

  const formations = ['CIRCLE', 'V_SHAPE', 'TWO_LINES', 'X_SHAPE', 'DIAMOND', 'STAR'];

  useEffect(() => {
    const timer = setInterval(() => {
      setFormationId(prev => (prev + 1) % formations.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const getTargetLayout = (idx: number, type: string): { pos: [number, number, number], rot: number } => {
    const radius = 10;
    const spacing = 5;
    switch (type) {
      case 'CIRCLE':
        const angle = (idx / 8) * Math.PI * 2;
        return { pos: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius], rot: -angle + Math.PI / 2 };
      case 'V_SHAPE':
        const vx = (idx - 3.5) * spacing;
        const vz = Math.abs(vx) * 0.9 - 5;
        return { pos: [vx, 0, vz], rot: 0 };
      case 'TWO_LINES':
        const lineIdx = idx < 4 ? 0 : 1;
        const posInLine = (idx % 4 - 1.5) * spacing;
        const lz = lineIdx === 0 ? -4 : 4;
        return { pos: [posInLine, 0, lz], rot: lineIdx === 0 ? 0 : Math.PI };
      case 'X_SHAPE':
        const xFactor = idx < 4 ? 1 : -1;
        const xpos = (idx % 4 - 1.5) * (spacing * 0.8);
        const xz = xpos * xFactor;
        return { pos: [xpos, 0, xz], rot: Math.atan2(xpos, xz) };
      case 'DIAMOND':
        const diamondMap: [number, number][] = [[0, -10], [0, 10], [-10, 0], [10, 0], [-5, -5], [-5, 5], [5, -5], [5, 5]];
        return { pos: [diamondMap[idx][0], 0, diamondMap[idx][1]], rot: 0 };
      case 'STAR':
        const starAngle = (idx / 8) * Math.PI * 2;
        const r = idx % 2 === 0 ? 12 : 5;
        return { pos: [Math.cos(starAngle) * r, 0, Math.sin(starAngle) * r], rot: -starAngle };
      default:
        return { pos: [0, 0, 0], rot: 0 };
    }
  };

  useFrame((state, delta) => {
    if (descentY > 0) {
      setDescentY(prev => Math.max(0, prev - delta * 35));
    }
    for (let i = 0; i < 8; i++) {
      const target = getTargetLayout(i, formations[formationId]);
      const current = currentPosRefs.current[i];
      current.x = THREE.MathUtils.lerp(current.x, target.pos[0], 0.08);
      current.z = THREE.MathUtils.lerp(current.z, target.pos[2], 0.08);
      current.y = descentY;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {new Array(8).fill(0).map((_, i) => (
        <Cheerleader 
          key={i} 
          position={currentPosRefs.current[i]} 
          rotation={getTargetLayout(i, formations[formationId]).rot} 
          delay={i * 0.25} 
          isDancing={descentY <= 0.1}
        />
      ))}
    </group>
  );
};

const Firework: React.FC<{ position: [number, number, number], color: string, onComplete: () => void }> = ({ position, color, onComplete }) => {
  const particles = useMemo(() => {
    return new Array(50).fill(0).map(() => ({
      velocity: new THREE.Vector3((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15),
      offset: new THREE.Vector3(0, 0, 0)
    }));
  }, []);
  const groupRef = useRef<THREE.Group>(null);
  const [elapsed, setElapsed] = useState(0);

  useFrame((state, delta) => {
    setElapsed(prev => prev + delta);
    if (elapsed > 2.0) { onComplete(); return; }
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const p = particles[i];
        p.offset.add(p.velocity.clone().multiplyScalar(delta));
        p.velocity.y -= 9.8 * delta * 0.6; 
        child.position.set(p.offset.x, p.offset.y, p.offset.z);
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m: any) => { if ('opacity' in m) m.opacity = Math.max(0, 1 - elapsed / 2.0); });
          } else {
            (mesh.material as any).opacity = Math.max(0, 1 - elapsed / 2.0);
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {particles.map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshBasicMaterial color={color} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
};

const FireworksDisplay: React.FC = () => {
  const [fireworks, setFireworks] = useState<{ id: number; position: [number, number, number]; color: string }[]>([]);
  const nextId = useRef(0);
  useFrame(() => {
    if (Math.random() < 0.1) { 
      const id = nextId.current++;
      const color = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3', '#ffffff', '#f472b6'][Math.floor(Math.random() * 9)];
      setFireworks(prev => [...prev, { id, position: [(Math.random() - 0.5) * 120, 5 + Math.random() * 20, (Math.random() - 0.5) * 120], color }]);
    }
  });
  return <>{fireworks.map(fw => <Firework key={fw.id} position={fw.position} color={fw.color} onComplete={() => setFireworks(p => p.filter(f => f.id !== fw.id))} />)}</>;
};

const Tree: React.FC<{ prop: WorldProp }> = ({ prop }) => (
  <group position={[prop.x, 0, prop.z]} scale={[prop.scale, prop.scale, prop.scale]}>
    <mesh position={[0, 1.5, 0]} castShadow receiveShadow><cylinderGeometry args={[0.4, 0.6, 3, 7]} /><meshStandardMaterial color="#5d4037" /></mesh>
    <mesh position={[0, 4, 0]} castShadow receiveShadow><dodecahedronGeometry args={[2.2]} /><meshStandardMaterial color="#15803d" /></mesh>
    <mesh position={[0, 5.5, 0]} castShadow receiveShadow><dodecahedronGeometry args={[1.5]} /><meshStandardMaterial color="#22c55e" /></mesh>
  </group>
);

const PlayerModel: React.FC<{ position: [number, number, number]; rotation: number; isMoving: boolean; }> = ({ position, rotation, isMoving }) => {
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (isMoving && legL.current && legR.current && armL.current && armR.current) {
      const t = state.clock.getElapsedTime();
      legL.current.rotation.x = Math.sin(t * 10) * 0.5;
      legR.current.rotation.x = Math.sin(t * 10 + Math.PI) * 0.5;
      armL.current.rotation.x = Math.sin(t * 10 + Math.PI) * 0.5;
      armR.current.rotation.x = Math.sin(t * 10) * 0.5;
    }
  });
  return (
    <group position={position} rotation={[0, rotation, 0]} castShadow>
      <mesh position={[0, 4.5, 0]} castShadow><boxGeometry args={[1.2, 1.2, 1.2]} /><meshStandardMaterial color="#fbbf24" /></mesh>
      <mesh position={[0, 3, 0]} castShadow><boxGeometry args={[2, 2, 1]} /><meshStandardMaterial color="#3b82f6" /></mesh>
      <mesh ref={armL} position={[-1.5, 3, 0]} castShadow><boxGeometry args={[0.8, 2, 0.8]} /><meshStandardMaterial color="#fbbf24" /></mesh>
      <mesh ref={armR} position={[1.5, 3, 0]} castShadow><boxGeometry args={[0.8, 2, 0.8]} /><meshStandardMaterial color="#fbbf24" /></mesh>
      <mesh ref={legL} position={[-0.5, 1, 0]} castShadow><boxGeometry args={[0.9, 2, 0.9]} /><meshStandardMaterial color="#22c55e" /></mesh>
      <mesh ref={legR} position={[0.5, 1, 0]} castShadow><boxGeometry args={[0.9, 2, 0.9]} /><meshStandardMaterial color="#22c55e" /></mesh>
    </group>
  );
};

const Monster3D: React.FC<{ monster: WorldMonster; isSelected: boolean; }> = ({ monster }) => {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) {
      group.current.position.y = monster.bodyType === 'biped' ? Math.sin(state.clock.getElapsedTime() * 2 + monster.id) * 0.1 : Math.sin(state.clock.getElapsedTime() * 2 + monster.id) * 0.1 - 0.5;
    }
  });
  return (
    <group ref={group} position={[monster.x, 1.5, monster.z]}>
      {monster.bodyType === 'biped' ? (
        <group>
          <mesh position={[0, 4, 0]} castShadow><boxGeometry args={[1.5, 1.5, 1.5]} /><meshStandardMaterial color={monster.color} /></mesh>
          <mesh position={[-0.3, 4, 0.76]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="black" /></mesh>
          <mesh position={[0.3, 4, 0.76]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="black" /></mesh>
          <mesh position={[0, 2.5, 0]} castShadow><boxGeometry args={[1.8, 1.5, 1]} /><meshStandardMaterial color={monster.color} /></mesh>
          <mesh position={[-0.5, 1, 0]} castShadow><boxGeometry args={[0.6, 1.5, 0.6]} /><meshStandardMaterial color="#1e293b" /></mesh>
          <mesh position={[0.5, 1, 0]} castShadow><boxGeometry args={[0.6, 1.5, 0.6]} /><meshStandardMaterial color="#1e293b" /></mesh>
        </group>
      ) : (
        <group scale={[0.8, 0.8, 0.8]}>
          <mesh position={[0, 2, 0]} castShadow><boxGeometry args={[1.5, 1.2, 3]} /><meshStandardMaterial color={monster.color} /></mesh>
          <mesh position={[0, 3, 1.5]} castShadow><boxGeometry args={[1.2, 1.2, 1.2]} /><meshStandardMaterial color={monster.color} /></mesh>
          <mesh position={[-0.6, 0.6, 1.2]} castShadow><boxGeometry args={[0.4, 1.2, 0.4]} /><meshStandardMaterial color="#1e293b" /></mesh>
          <mesh position={[0.6, 0.6, 1.2]} castShadow><boxGeometry args={[0.4, 1.2, 0.4]} /><meshStandardMaterial color="#1e293b" /></mesh>
        </group>
      )}
      <mesh position={[0, 6, 0]}><planeGeometry args={[3, 0.5]} /><meshBasicMaterial color="red" /></mesh>
    </group>
  );
};

const World: React.FC<{ playerPos: {x: number, z: number, rotation: number}; monsters: WorldMonster[]; props: WorldProp[]; onPlayerMove: (pos: {x: number, z: number}, rot: number) => void; isBattling: boolean; isCelebration: boolean; }> = ({ playerPos, monsters, props, onPlayerMove, isBattling, isCelebration }) => {
  const { camera } = useThree();
  const [controls, setControls] = useState({ up: false, down: false, left: false, right: false, rotateLeft: false, rotateRight: false, rotateUp: false, rotateDown: false });
  const orbitAngle = useRef({ h: 0, v: 1.1 }); 

  useEffect(() => {
    const handleKD = (e: KeyboardEvent) => { if (!isBattling) { switch(e.key) { case 'w': setControls(c => ({...c, up: true})); break; case 's': setControls(c => ({...c, down: true})); break; case 'a': setControls(c => ({...c, left: true})); break; case 'd': setControls(c => ({...c, right: true})); break; case 'ArrowLeft': setControls(c => ({...c, rotateLeft: true})); break; case 'ArrowRight': setControls(c => ({...c, rotateRight: true})); break; case 'ArrowUp': setControls(c => ({...c, rotateUp: true})); break; case 'ArrowDown': setControls(c => ({...c, rotateDown: true})); break; } } };
    const handleKU = (e: KeyboardEvent) => { switch(e.key) { case 'w': setControls(c => ({...c, up: false})); break; case 's': setControls(c => ({...c, down: false})); break; case 'a': setControls(c => ({...c, left: false})); break; case 'd': setControls(c => ({...c, right: false})); break; case 'ArrowLeft': setControls(c => ({...c, rotateLeft: false})); break; case 'ArrowRight': setControls(c => ({...c, rotateRight: false})); break; case 'ArrowUp': setControls(c => ({...c, rotateUp: false})); break; case 'ArrowDown': setControls(c => ({...c, rotateDown: false})); break; } };
    window.addEventListener('keydown', handleKD); window.addEventListener('keyup', handleKU);
    return () => { window.removeEventListener('keydown', handleKD); window.removeEventListener('keyup', handleKU); };
  }, [isBattling]);

  useFrame((state, delta) => {
    if (controls.rotateLeft) orbitAngle.current.h += ROTATION_SPEED * delta;
    if (controls.rotateRight) orbitAngle.current.h -= ROTATION_SPEED * delta;
    if (controls.rotateUp) orbitAngle.current.v = Math.max(0.1, orbitAngle.current.v - ROTATION_SPEED * delta * 0.5);
    if (controls.rotateDown) orbitAngle.current.v = Math.min(Math.PI / 2.1, orbitAngle.current.v + ROTATION_SPEED * delta * 0.5);
    const cameraDist = isCelebration ? 45 : 30; 
    const cameraOffset = new THREE.Vector3(Math.sin(orbitAngle.current.h) * cameraDist * Math.cos(orbitAngle.current.v), cameraDist * Math.sin(orbitAngle.current.v), Math.cos(orbitAngle.current.h) * cameraDist * Math.cos(orbitAngle.current.v));
    camera.position.lerp(new THREE.Vector3(playerPos.x, 0, playerPos.z).add(cameraOffset), 0.1);
    camera.lookAt(playerPos.x, 2, playerPos.z);
    if (!isBattling) {
      const move = new THREE.Vector3(0, 0, 0);
      const forward = new THREE.Vector3(Math.sin(orbitAngle.current.h), 0, Math.cos(orbitAngle.current.h)).normalize().negate();
      const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
      if (controls.up) move.add(forward); if (controls.down) move.sub(forward); if (controls.right) move.add(right); if (controls.left) move.sub(right);
      if (move.length() > 0) {
        move.normalize().multiplyScalar(MOVEMENT_SPEED * delta);
        const nX = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, playerPos.x + move.x));
        const nZ = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, playerPos.z + move.z));
        onPlayerMove({x: nX, z: nZ}, Math.atan2(move.x, move.z));
      }
    }
  });

  return (
    <>
      <ambientLight intensity={isCelebration ? 0.3 : 0.5} />
      <directionalLight position={[50, 150, 50]} intensity={1.5} castShadow />
      <Sky sunPosition={[50, 150, 50]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} /><meshStandardMaterial color="#4ade80" /></mesh>
      <gridHelper args={[WORLD_SIZE, 40, "#15803d", "#15803d"]} position={[0, 0.1, 0]} />
      <PlayerModel position={[playerPos.x, 0, playerPos.z]} rotation={playerPos.rotation} isMoving={!isBattling && (controls.up || controls.down || controls.left || controls.right)} />
      {props.map(p => <Tree key={p.id} prop={p} />)}
      {monsters.map(m => !m.isDefeated && <Monster3D key={m.id} monster={m} isSelected={false} />)}
      {isCelebration && (
        <>
          <FireworksDisplay />
          <CelebrationCheer />
          <VictorySpotlights />
        </>
      )}
    </>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({ playerHp: PLAYER_MAX_HP, maxPlayerHp: PLAYER_MAX_HP, enemyHp: MONSTER_HP, maxEnemyHp: MONSTER_HP, score: 0, streak: 0, level: 1, status: 'MENU' });
  const [activeDataset, setActiveDataset] = useState<Idiom[]>(ALL_IDIOMS);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [recentUrls, setRecentUrls] = useState<string[]>(() => JSON.parse(localStorage.getItem('idiomQuest_recentUrls') || '[]'));
  const [showHistory, setShowHistory] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0, rotation: 0 });
  const [worldMonsters, setWorldMonsters] = useState<WorldMonster[]>([]);
  const [worldProps, setWorldProps] = useState<WorldProp[]>([]);
  const [currentMonsterId, setCurrentMonsterId] = useState<number | null>(null);
  const [gameQueue, setGameQueue] = useState<Idiom[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [wrongIdioms, setWrongIdioms] = useState<WrongRecord[]>(() => JSON.parse(localStorage.getItem('idiomQuest_wrongRecords') || '[]'));
  const [showReview, setShowReview] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('DEF_TO_IDIOM');
  const [selectedMonsterCount, setSelectedMonsterCount] = useState<number>(10);
  const [isCelebration, setIsCelebration] = useState(false);
  const [celebrationTimeLeft, setCelebrationTimeLeft] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<Idiom[]>([]);
  const [selectedWrongIds, setSelectedWrongIds] = useState<string[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => localStorage.setItem('idiomQuest_wrongRecords', JSON.stringify(wrongIdioms)), [wrongIdioms]);

  const playExplosionSound = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current; if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(100, t); osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
    gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.5);
  };

  const initWorld = useCallback((count: number) => {
    const newMonsters: WorldMonster[] = [];
    for (let i = 0; i < count; i++) {
      newMonsters.push({ id: i, x: (Math.random() - 0.5) * (WORLD_SIZE * 0.8), z: (Math.random() - 0.5) * (WORLD_SIZE * 0.8), level: 1, isDefeated: false, color: MONSTER_COLORS[i % MONSTER_COLORS.length], bodyType: Math.random() > 0.5 ? 'biped' : 'quadruped' });
    }
    setWorldMonsters(newMonsters);
    const newProps: WorldProp[] = [];
    for (let i = 0; i < 50; i++) { newProps.push({ id: i, type: 'tree', x: (Math.random() - 0.5) * WORLD_SIZE, z: (Math.random() - 0.5) * WORLD_SIZE, scale: 0.8 + Math.random() * 0.5 }); }
    setWorldProps(newProps); setPlayerPos({ x: 0, z: 0, rotation: 0 });
  }, []);

  const startGame = async (mode: GameMode) => {
    setMenuError(null); setIsLoading(true);
    let dataset = ALL_IDIOMS;
    if (isCustomMode && customUrl) { try { const resp = await fetch(customUrl); dataset = await resp.json(); setActiveDataset(dataset); } catch (e) { setMenuError("Failed to load custom data."); setIsLoading(false); return; } }
    const total = Math.min(selectedMonsterCount, dataset.length);
    setGameQueue([...dataset].sort(() => 0.5 - Math.random()).slice(0, total));
    setGameMode(mode); initWorld(total);
    setGameState({ playerHp: PLAYER_MAX_HP, maxPlayerHp: PLAYER_MAX_HP, enemyHp: MONSTER_HP, maxEnemyHp: MONSTER_HP, score: 0, streak: 0, level: 1, status: 'EXPLORING' });
    setIsCelebration(false); setIsLoading(false);
  };

  const startCelebration = () => {
    setIsCelebration(true);
    setCelebrationTimeLeft(30);
    const soundInterval = setInterval(playExplosionSound, 800);
    const countdownInterval = setInterval(() => setCelebrationTimeLeft(p => Math.max(0, p - 1)), 1000);
    setTimeout(() => {
      clearInterval(soundInterval);
      clearInterval(countdownInterval);
      setIsCelebration(false);
      setGameState(p => ({ ...p, status: 'VICTORY' }));
    }, 30000); 
  };

  const handlePlayerMove = (pos: {x: number, z: number}, rot: number) => {
    setPlayerPos({ ...pos, rotation: rot });
    const collided = worldMonsters.find(m => !m.isDefeated && Math.hypot(m.x - pos.x, m.z - pos.z) < INTERACTION_DISTANCE);
    if (collided) {
      setCurrentMonsterId(collided.id);
      const q = gameQueue[collided.id];
      const distractors = activeDataset.filter(i => i.id !== q.id).sort(() => 0.5 - Math.random()).slice(0, 3);
      setCurrentOptions([...distractors, q].sort(() => 0.5 - Math.random()));
      setSelectedWrongIds([]);
      setGameState(p => ({ ...p, status: 'BATTLE', enemyHp: MONSTER_HP }));
    }
  };

  const triggerFloatingText = (text: string, type: 'damage' | 'heal' | 'miss') => {
    const id = Date.now();
    setFloatingTexts(p => [...p, { id, text, type, x: 50, y: 40 }]);
    setTimeout(() => setFloatingTexts(p => p.filter(i => i.id !== id)), 1000);
  };

  const handleAttack = (option: Idiom) => {
    const currentQ = gameQueue[currentMonsterId!];
    if (option.id === currentQ.id) {
      triggerFloatingText("1000", 'damage');
      setGameState(p => ({ ...p, score: p.score + 100, streak: p.streak + 1, enemyHp: 0 }));
      setShowFeedback(true);
    } else {
      triggerFloatingText("Miss", "miss");
      setSelectedWrongIds(p => [...p, option.id]);
      setGameState(p => ({ ...p, playerHp: Math.max(0, p.playerHp - 15) }));
      if (gameState.playerHp - 15 <= 0) setGameState(p => ({ ...p, status: 'DEFEAT' }));
    }
  };

  const handleFeedbackNext = () => {
    setShowFeedback(false);
    setWorldMonsters(p => p.map(m => m.id === currentMonsterId ? { ...m, isDefeated: true } : m));
    if (worldMonsters.filter(m => !m.isDefeated && m.id !== currentMonsterId).length === 0) {
      setGameState(p => ({ ...p, status: 'EXPLORING' })); 
      startCelebration();
    } else {
      setGameState(p => ({ ...p, status: 'EXPLORING' }));
    }
  };

  return (
    <div className="w-full h-screen bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [0, 20, 20], fov: 50 }}>
          <World playerPos={playerPos} monsters={worldMonsters} props={worldProps} onPlayerMove={handlePlayerMove} isBattling={gameState.status === 'BATTLE'} isCelebration={isCelebration} />
        </Canvas>
      </div>

      {gameState.status === 'MENU' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-50 p-4">
          <h1 className="text-6xl font-black text-yellow-400 mb-8 tracking-tighter text-center drop-shadow-lg">IDIOM QUEST 3D</h1>
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full">
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-400 mb-2">Monsters to Defeat</label>
              <div className="flex gap-2 justify-center">
                {[5, 10, 15].map(c => (
                  <button key={c} onClick={() => setSelectedMonsterCount(c)} className={`px-4 py-2 rounded-lg font-bold border-2 transition-all ${selectedMonsterCount === c ? 'bg-yellow-500 border-yellow-300 text-black scale-105' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => startGame('DEF_TO_IDIOM')}>Mode 1: Definition → Idiom</Button>
              <Button className="w-full bg-indigo-600 border-indigo-800" onClick={() => startGame('IDIOM_TO_DEF')}>Mode 2: Idiom → Definition</Button>
            </div>
          </div>
        </div>
      )}

      {isCelebration && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-center flex flex-col items-center gap-1">
          <div className="bg-yellow-400 text-black px-4 py-1.5 rounded-full font-black text-lg shadow-[0_0_20px_rgba(234,179,8,0.7)] flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4" />
            VICTORY SHOW!
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-lg font-black text-base drop-shadow-lg flex items-center justify-center gap-1.5 border border-white/20">
            <Timer className="w-4 h-4 text-yellow-400" /> {celebrationTimeLeft}s
          </div>
        </div>
      )}

      {gameState.status === 'BATTLE' && (
        <div className="absolute inset-0 z-40 bg-slate-900/60 backdrop-blur-sm flex flex-col">
          {showFeedback ? (
             <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-slate-800 border-2 border-green-500 rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl">
                   <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                   <h2 className="text-4xl font-black text-yellow-400 mb-2">{gameQueue[currentMonsterId!].word}</h2>
                   <p className="text-slate-300 mb-6">{gameQueue[currentMonsterId!].definition}</p>
                   <Button className="w-full bg-green-600" onClick={handleFeedbackNext}>Next Monster</Button>
                </div>
             </div>
          ) : (
            <>
              <div className="p-4 flex justify-between items-center">
                <HealthBar current={gameState.playerHp} max={gameState.maxPlayerHp} label="You" isPlayer />
                <HealthBar current={gameState.enemyHp} max={gameState.maxEnemyHp} label="Monster" color="bg-red-500" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
                <div className="bg-slate-800/90 border-2 border-yellow-500/50 p-6 rounded-2xl text-2xl font-bold text-center max-w-2xl shadow-2xl">
                  {gameMode === 'DEF_TO_IDIOM' ? gameQueue[currentMonsterId!].definition : gameQueue[currentMonsterId!].word}
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
                  {currentOptions.map(o => (
                    <Button key={o.id} variant="secondary" onClick={() => handleAttack(o)} disabled={selectedWrongIds.includes(o.id)} className={selectedWrongIds.includes(o.id) ? 'opacity-30' : ''}>
                      {gameMode === 'DEF_TO_IDIOM' ? o.word : o.definition}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
          <FloatingTextDisplay items={floatingTexts} />
        </div>
      )}

      {(gameState.status === 'VICTORY' || gameState.status === 'DEFEAT') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-2xl border-4 border-slate-600 text-center shadow-2xl">
            {gameState.status === 'VICTORY' ? <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4 animate-bounce" /> : <Skull className="w-24 h-24 text-red-500 mx-auto mb-4" />}
            <h2 className={`text-5xl font-black mb-2 ${gameState.status === 'VICTORY' ? 'text-yellow-400' : 'text-red-500'}`}>{gameState.status === 'VICTORY' ? 'VICTORY!' : 'DEFEAT'}</h2>
            <p className="text-2xl font-bold mb-8">Final Score: {gameState.score}</p>
            <Button onClick={() => setGameState(p => ({ ...p, status: 'MENU' }))}>Back to Menu</Button>
          </div>
        </div>
      )}

      {gameState.status === 'EXPLORING' && !isCelebration && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
           <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-600 text-yellow-400 font-bold flex items-center gap-2"><Trophy className="w-5 h-5" /> {gameState.score}</div>
           <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-600 text-red-400 font-bold flex items-center gap-2"><Skull className="w-5 h-5" /> {worldMonsters.filter(m => !m.isDefeated).length} Left</div>
        </div>
      )}
    </div>
  );
}
