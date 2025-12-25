
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Text, useFont } from '@react-three/drei';
import * as THREE from 'three';
import { ALL_IDIOMS } from './data/idioms';
import { Idiom, GameState, FloatingText, WorldMonster, GameMode, WrongRecord, WorldProp } from './types';
import { Button } from './components/Button';
import { HealthBar } from './components/HealthBar';
import { FloatingTextDisplay } from './components/FloatingTextDisplay';
import ReloadPrompt from './components/ReloadPrompt';
import { Sword, Trophy, Zap, RefreshCw, Skull, Map as MapIcon, Compass, BookOpen, X, List, ArrowLeftRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2, Library, LogOut, Users, Swords, Link as LinkIcon, AlertCircle, Loader2, FileJson, Copy, Check, Sparkles, Gamepad2, History, FastForward } from 'lucide-react';

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
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6', '#d946ef', '#f43f5e', 
];

const EXAMPLE_JSON_CONTENT = `[
  {
    "word": "下落不明",
    "definition": "不知去處,毫無信息。",
    "example": "自從那場大地震後，他便下落不明。"
  }
]`;

// -----------------------------------------------------------------------------
// Components: 3D Models & Effects
// -----------------------------------------------------------------------------

const Cheerleader: React.FC<{ 
  position: THREE.Vector3, 
  rotation: number, 
  delay: number,
  isDancing: boolean 
}> = ({ position, rotation, delay, isDancing }) => {
  const group = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (group.current) {
      const t = state.clock.getElapsedTime() * 6 + delay;
      if (isDancing) {
        group.current.position.y = position.y + Math.abs(Math.sin(t)) * 1.5;
        if (armL.current && armR.current) {
          const armPhase = Math.floor(t / 4) % 3;
          if (armPhase === 0) {
            armL.current.rotation.z = 2.2 + Math.sin(t * 2) * 0.3;
            armR.current.rotation.z = -2.2 - Math.sin(t * 2) * 0.3;
          } else if (armPhase === 1) {
            armL.current.rotation.z = 0.5 + Math.sin(t * 4) * 0.8;
            armR.current.rotation.z = -0.5 - Math.sin(t * 4) * 0.8;
          } else {
            armL.current.rotation.x = Math.sin(t * 3) * 1.5;
            armR.current.rotation.x = Math.cos(t * 3) * 1.5;
          }
        }
        if (body.current) {
          body.current.rotation.z = Math.sin(t * 0.5) * 0.15;
          body.current.rotation.y = Math.cos(t * 0.5) * 0.2;
        }
        if (head.current) head.current.rotation.x = Math.sin(t * 2) * 0.1;
        if (legL.current && legR.current) {
          legL.current.rotation.x = Math.sin(t * 1.5) * 0.4;
          legR.current.rotation.x = Math.cos(t * 1.5) * 0.4;
        }
      } else {
        group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, position.y, 0.1);
      }
      const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      group.current.quaternion.slerp(targetQuat, 0.1);
      group.current.position.x = position.x;
      group.current.position.z = position.z;
    }
  });

  return (
    <group ref={group}>
      <group ref={body}>
        <mesh position={[0, 2.5, 0]} castShadow>
          <boxGeometry args={[1.2, 1.8, 0.8]} />
          <meshStandardMaterial color="#f472b6" />
        </mesh>
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.7, 1.3, 0.7, 12]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh ref={head} position={[0, 3.8, 0]} castShadow>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshStandardMaterial color="#ffdbac" />
        </mesh>
        <group position={[0, 4.2, -0.4]}>
          <mesh castShadow><boxGeometry args={[1.2, 0.4, 0.6]} /><meshStandardMaterial color="#fbbf24" /></mesh>
          <mesh position={[0, -0.5, -0.4]} rotation={[0.4, 0, 0]}><boxGeometry args={[0.4, 1.2, 0.3]} /><meshStandardMaterial color="#fbbf24" /></mesh>
        </group>
        <group ref={armL} position={[-0.8, 3.2, 0]}>
          <mesh position={[-0.2, -0.5, 0]} castShadow><boxGeometry args={[0.4, 1.2, 0.4]} /><meshStandardMaterial color="#ffdbac" /></mesh>
          <mesh position={[-0.3, -1.2, 0]}><sphereGeometry args={[0.7, 12, 12]} /><meshStandardMaterial color="#fcd34d" emissive="#f59e0b" emissiveIntensity={0.8} /></mesh>
        </group>
        <group ref={armR} position={[0.8, 3.2, 0]}>
          <mesh position={[0.2, -0.5, 0]} castShadow><boxGeometry args={[0.4, 1.2, 0.4]} /><meshStandardMaterial color="#ffdbac" /></mesh>
          <mesh position={[0.3, -1.2, 0]}><sphereGeometry args={[0.7, 12, 12]} /><meshStandardMaterial color="#fcd34d" emissive="#f59e0b" emissiveIntensity={0.8} /></mesh>
        </group>
        <mesh ref={legL} position={[-0.3, 0.6, 0]} castShadow><boxGeometry args={[0.45, 1.2, 0.45]} /><meshStandardMaterial color="#ffdbac" /></mesh>
        <mesh ref={legR} position={[0.3, 0.6, 0]} castShadow><boxGeometry args={[0.45, 1.2, 0.45]} /><meshStandardMaterial color="#ffdbac" /></mesh>
      </group>
    </group>
  );
};

const CelebrationCheer: React.FC = () => {
  const [descentY, setDescentY] = useState(40);
  const [formationId, setFormationId] = useState(0);
  const currentPosRefs = useRef<THREE.Vector3[]>(new Array(8).fill(0).map(() => new THREE.Vector3(0, 40, 0)));
  const formations = ['CIRCLE', 'V_SHAPE', 'DIAMOND', 'X_CROSS', 'TWO_LINES'];

  useEffect(() => {
    const timer = setInterval(() => setFormationId(prev => (prev + 1) % formations.length), 4000);
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
        const vz = Math.abs(vx) * 0.7 - 5;
        return { pos: [vx, 0, vz], rot: 0 };
      case 'DIAMOND':
        const dAngle = (idx / 8) * Math.PI * 2;
        const dist = (idx % 2 === 0) ? radius : radius * 0.7;
        return { pos: [Math.cos(dAngle) * dist, 0, Math.sin(dAngle) * dist], rot: -dAngle };
      case 'X_CROSS':
        const side = idx < 4 ? 1 : -1;
        const offset = (idx % 4 - 1.5) * spacing;
        return { pos: [offset, 0, offset * side], rot: 0 };
      case 'TWO_LINES':
        const isBack = idx < 4;
        return { pos: [(idx % 4 - 1.5) * (spacing * 1.2), 0, isBack ? -4 : 4], rot: isBack ? 0 : Math.PI };
      default: return { pos: [0, 0, 0], rot: 0 };
    }
  };

  useFrame((state, delta) => {
    if (descentY > 0) setDescentY(prev => Math.max(0, prev - delta * 20));
    for (let i = 0; i < 8; i++) {
      const target = getTargetLayout(i, formations[formationId]);
      const current = currentPosRefs.current[i];
      current.x = THREE.MathUtils.lerp(current.x, target.pos[0], 0.04);
      current.z = THREE.MathUtils.lerp(current.z, target.pos[2], 0.04);
      current.y = descentY;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {new Array(8).fill(0).map((_, i) => (
        <Cheerleader key={i} position={currentPosRefs.current[i]} rotation={getTargetLayout(i, formations[formationId]).rot} delay={i * 0.4} isDancing={descentY <= 1} />
      ))}
    </group>
  );
};

const Firework: React.FC<{ position: [number, number, number], color: string, onComplete: () => void }> = ({ position, color, onComplete }) => {
  const particles = useMemo(() => new Array(50).fill(0).map(() => ({
    velocity: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.2) * 12, (Math.random() - 0.5) * 12),
    offset: new THREE.Vector3(0, 0, 0)
  })), []);
  const groupRef = useRef<THREE.Group>(null);
  const [elapsed, setElapsed] = useState(0);
  useFrame((state, delta) => {
    setElapsed(prev => prev + delta);
    if (elapsed > 2.0) { onComplete(); return; }
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const p = particles[i];
        p.offset.add(p.velocity.clone().multiplyScalar(delta));
        p.velocity.y -= 9.8 * delta * 0.4; 
        child.position.set(p.offset.x, p.offset.y, p.offset.z);
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, 1 - elapsed / 2.0);
      });
    }
  });
  return (
    <group ref={groupRef} position={position}>
      {particles.map((_, i) => (
        <mesh key={i}><boxGeometry args={[0.3, 0.3, 0.3]} /><meshBasicMaterial color={color} transparent opacity={1} /></mesh>
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
      const x = (Math.random() - 0.5) * 120;
      const z = (Math.random() - 0.5) * 120;
      const rainbowColors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3', '#f472b6', '#ffffff'];
      setFireworks(prev => [...prev, { id, position: [x, 5 + Math.random() * 15, z], color: rainbowColors[Math.floor(Math.random() * rainbowColors.length)] }]);
    }
  });
  const removeFirework = (id: number) => setFireworks(prev => prev.filter(fw => fw.id !== id));
  return <>{fireworks.map(fw => <Firework key={fw.id} position={fw.position} color={fw.color} onComplete={() => removeFirework(fw.id)} />)}</>;
};

const Tree: React.FC<{ prop: WorldProp }> = ({ prop }) => (
  <group position={[prop.x, 0, prop.z]} scale={[prop.scale, prop.scale, prop.scale]}>
    <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.4, 0.6, 3, 7]} /><meshStandardMaterial color="#5d4037" /></mesh>
    <mesh position={[0, 4, 0]} castShadow><dodecahedronGeometry args={[2.2]} /><meshStandardMaterial color="#15803d" /></mesh>
    <mesh position={[0, 5.5, 0]} castShadow><dodecahedronGeometry args={[1.5]} /><meshStandardMaterial color="#22c55e" /></mesh>
  </group>
);

const PlayerModel: React.FC<{ position: [number, number, number]; rotation: number; isMoving: boolean; }> = ({ position, rotation, isMoving }) => {
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (isMoving && legL.current && legR.current && armL.current && armR.current) {
      legL.current.rotation.x = Math.sin(t * 10) * 0.5;
      legR.current.rotation.x = Math.sin(t * 10 + Math.PI) * 0.5;
      armL.current.rotation.x = Math.sin(t * 10 + Math.PI) * 0.5;
      armR.current.rotation.x = Math.sin(t * 10) * 0.5;
    } else if (legL.current && legR.current && armL.current && armR.current) {
      legL.current.rotation.x = legR.current.rotation.x = armL.current.rotation.x = armR.current.rotation.x = 0;
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
    if (group.current) group.current.position.y = (monster.bodyType === 'biped' ? Math.sin(state.clock.getElapsedTime() * 2 + monster.id) * 0.1 : Math.sin(state.clock.getElapsedTime() * 2 + monster.id) * 0.1 - 0.5);
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
        <group scale={[0.8, 0.8, 0.8]} position={[0, 0.5, 0]}> 
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

const World: React.FC<{ 
  playerPos: {x: number, z: number, rotation: number}; monsters: WorldMonster[]; props: WorldProp[]; onPlayerMove: (newPos: {x: number, z: number}, rotation: number) => void; isBattling: boolean; isCelebration: boolean;
}> = ({ playerPos, monsters, props, onPlayerMove, isBattling, isCelebration }) => {
  const { camera } = useThree();
  const [controls, setControls] = useState({ up: false, down: false, left: false, right: false, rotateLeft: false, rotateRight: false, rotateUp: false, rotateDown: false });
  const orbitAngle = useRef({ h: 0, v: 1.1 }); 
  const sunPosition: [number, number, number] = [50, 150, 50]; 

  useEffect(() => {
    if (isBattling) setControls({ up: false, down: false, left: false, right: false, rotateLeft: false, rotateRight: false, rotateUp: false, rotateDown: false });
  }, [isBattling]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent, val: boolean) => {
      if (isBattling) return; 
      switch(e.key) {
        case 'w': case 'W': setControls(c => ({ ...c, up: val })); break;
        case 's': case 'S': setControls(c => ({ ...c, down: val })); break;
        case 'a': case 'A': setControls(c => ({ ...c, left: val })); break;
        case 'd': case 'D': setControls(c => ({ ...c, right: val })); break;
        case 'ArrowLeft': setControls(c => ({ ...c, rotateLeft: val })); break;
        case 'ArrowRight': setControls(c => ({ ...c, rotateRight: val })); break;
        case 'ArrowUp': setControls(c => ({ ...c, rotateUp: val })); break;
        case 'ArrowDown': setControls(c => ({ ...c, rotateDown: val })); break;
      }
    };
    (window as any).setVirtualControl = (k: string, v: boolean) => setControls(c => ({ ...c, [k]: v }));
    const down = (e: KeyboardEvent) => handleKey(e, true), up = (e: KeyboardEvent) => handleKey(e, false);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); delete (window as any).setVirtualControl; };
  }, [isBattling]);

  useFrame((state, delta) => {
    if (controls.rotateLeft) orbitAngle.current.h += ROTATION_SPEED * delta;
    if (controls.rotateRight) orbitAngle.current.h -= ROTATION_SPEED * delta;
    if (controls.rotateUp) orbitAngle.current.v = Math.max(0.1, orbitAngle.current.v - ROTATION_SPEED * delta * 0.5);
    if (controls.rotateDown) orbitAngle.current.v = Math.min(Math.PI / 2.1, orbitAngle.current.v + ROTATION_SPEED * delta * 0.5);
    const cameraDist = 30; 
    const cameraOffset = new THREE.Vector3(Math.sin(orbitAngle.current.h) * cameraDist * Math.cos(orbitAngle.current.v), cameraDist * Math.sin(orbitAngle.current.v), Math.cos(orbitAngle.current.h) * cameraDist * Math.cos(orbitAngle.current.v));
    camera.position.lerp(new THREE.Vector3(playerPos.x, 0, playerPos.z).add(cameraOffset), 0.1);
    camera.lookAt(playerPos.x, 2, playerPos.z);
    if (!isBattling) {
      const moveVec = new THREE.Vector3(0, 0, 0);
      const forward = new THREE.Vector3(Math.sin(orbitAngle.current.h), 0, Math.cos(orbitAngle.current.h)).normalize().negate(), right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
      if (controls.up) moveVec.add(forward); if (controls.down) moveVec.sub(forward); if (controls.right) moveVec.add(right); if (controls.left) moveVec.sub(right);
      if (moveVec.length() > 0) {
        moveVec.normalize().multiplyScalar(MOVEMENT_SPEED * delta);
        const newX = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, playerPos.x + moveVec.x)), newZ = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, playerPos.z + moveVec.z));
        const targetRotation = Math.atan2(moveVec.x, moveVec.z);
        let rotDiff = targetRotation - playerPos.rotation;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2; while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        onPlayerMove({x: newX, z: newZ}, playerPos.rotation + rotDiff * 10 * delta);
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} /><directionalLight position={sunPosition} intensity={1.5} castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.0005}><orthographicCamera attach="shadow-camera" args={[-300, 300, 300, -300]} /></directionalLight>
      <Sky sunPosition={sunPosition} /><Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} /><meshStandardMaterial color="#4ade80" /></mesh>
      <gridHelper args={[WORLD_SIZE, 40, "#15803d", "#15803d"]} position={[0, 0.1, 0]} />
      <PlayerModel position={[playerPos.x, 0, playerPos.z]} rotation={playerPos.rotation} isMoving={!isBattling && (controls.up || controls.down || controls.left || controls.right)} />
      {props.map(prop => <Tree key={prop.id} prop={prop} />)}
      {monsters.map(m => !m.isDefeated && <Monster3D key={m.id} monster={m} isSelected={false} />)}
      {isCelebration && <><FireworksDisplay /><CelebrationCheer /></>}
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<Idiom[]>([]);
  const [selectedWrongIds, setSelectedWrongIds] = useState<string[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const celebrationTimerRef = useRef<any>(null);
  const explosionIntervalRef = useRef<any>(null);

  useEffect(() => localStorage.setItem('idiomQuest_wrongRecords', JSON.stringify(wrongIdioms)), [wrongIdioms]);
  const addToRecentUrls = (url: string) => setRecentUrls(prev => { const n = [url, ...prev.filter(u => u !== url)].slice(0, 10); localStorage.setItem('idiomQuest_recentUrls', JSON.stringify(n)); return n; });

  const initAudio = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const playExplosionSound = () => {
    const ctx = initAudio();
    const t = ctx.currentTime, osc = ctx.createOscillator(), g1 = ctx.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(100, t); osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
    g1.gain.setValueAtTime(0.5, t); g1.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc.connect(g1); g1.connect(ctx.destination); osc.start(t); osc.stop(t + 0.5);
  };

  const playAttackSound = () => {
    const ctx = initAudio();
    const t = ctx.currentTime, osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'triangle'; 
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.1);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.1);
  };

  const playHitSound = () => {
    const ctx = initAudio();
    const t = ctx.currentTime, osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.2);
  };

  const playSuccessSound = () => {
    const ctx = initAudio();
    const t = ctx.currentTime;
    [880, 1100, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t + i * 0.05);
      g.gain.setValueAtTime(0.2, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.05 + 0.3);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t + i * 0.05); osc.stop(t + i * 0.05 + 0.3);
    });
  };

  const playFailureSound = () => {
    const ctx = initAudio();
    const t = ctx.currentTime, osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.4);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.4);
  };

  const fetchAndValidateCustomData = async (url: string): Promise<Idiom[]> => {
    const res = await fetch(url); if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json(); if (!Array.isArray(data)) throw new Error('Root must be an array.');
    return data.map((it: any, i: number) => ({ id: `custom-${i}`, word: String(it.word || it.idiom).trim(), definition: String(it.definition || it.meaning).trim(), example: it.example }));
  };

  const initWorld = useCallback((count: number) => {
    setWorldMonsters(new Array(count).fill(0).map((_, i) => ({ id: i, x: (Math.random() - 0.5) * (WORLD_SIZE * 0.8), z: (Math.random() - 0.5) * (WORLD_SIZE * 0.8), level: 1, isDefeated: false, color: MONSTER_COLORS[i % MONSTER_COLORS.length], bodyType: Math.random() > 0.5 ? 'biped' : 'quadruped' })));
    setWorldProps(new Array(50).fill(0).map((_, i) => ({ id: i, type: 'tree', x: (Math.random() - 0.5) * (WORLD_SIZE * 0.9), z: (Math.random() - 0.5) * (WORLD_SIZE * 0.9), scale: 0.8 + Math.random() * 0.5 })));
    setPlayerPos({ x: 0, z: 0, rotation: 0 });
  }, []);

  const startGame = async (mode: GameMode) => {
    setMenuError(null); setIsLoading(true);
    let d = ALL_IDIOMS; if (isCustomMode && customUrl) try { d = await fetchAndValidateCustomData(customUrl); setActiveDataset(d); addToRecentUrls(customUrl); } catch (e: any) { setMenuError(e.message); setIsLoading(false); return; }
    else setActiveDataset(ALL_IDIOMS);
    const count = Math.min(selectedMonsterCount, d.length);
    setGameQueue([...d].sort(() => 0.5 - Math.random()).slice(0, count));
    setGameMode(mode); initWorld(count);
    setGameState({ playerHp: PLAYER_MAX_HP, maxPlayerHp: PLAYER_MAX_HP, enemyHp: MONSTER_HP, maxEnemyHp: MONSTER_HP, score: 0, streak: 0, level: 1, status: 'EXPLORING' });
    setIsCelebration(false); setIsLoading(false);
  };

  const endCelebrationEarly = () => {
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    if (explosionIntervalRef.current) clearInterval(explosionIntervalRef.current);
    setIsCelebration(false);
    setGameState(prev => ({ ...prev, status: 'VICTORY' }));
  };

  const startCelebration = () => {
    setIsCelebration(true); playExplosionSound();
    explosionIntervalRef.current = setInterval(playExplosionSound, 1000);
    celebrationTimerRef.current = setTimeout(endCelebrationEarly, 30000); 
  };

  const handlePlayerMove = (newPos: {x: number, z: number}, rotation: number) => {
    setPlayerPos({ ...newPos, rotation });
    const collided = worldMonsters.find(m => !m.isDefeated && Math.hypot(m.x - newPos.x, m.z - newPos.z) < INTERACTION_DISTANCE);
    if (collided) {
      setCurrentMonsterId(collided.id); const q = gameQueue[collided.id];
      if (q) {
        const others = activeDataset.filter(i => i.id !== q.id);
        setCurrentOptions([...others.sort(() => 0.5 - Math.random()).slice(0, 3), q].sort(() => 0.5 - Math.random()));
        setSelectedWrongIds([]); setGameState(prev => ({ ...prev, status: 'BATTLE', enemyHp: MONSTER_HP }));
      }
    }
  };

  const triggerFloatingText = (t: string, ty: 'damage' | 'heal' | 'miss') => {
    const id = Date.now(); setFloatingTexts(prev => [...prev, { id, text: t, type: ty, x: 50 + (Math.random() - 0.5) * 20, y: 40 }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(it => it.id !== id)), 1000);
  };

  const handleAttack = (opt: Idiom) => {
    if (currentMonsterId === null || selectedWrongIds.includes(opt.id)) return;
    
    playAttackSound();
    const q = gameQueue[currentMonsterId!]; 
    if (opt.id === q.id) {
      playHitSound();
      playSuccessSound();
      triggerFloatingText("1000", 'damage'); triggerFloatingText("+5 HP", "heal");
      setGameState(p => ({ ...p, score: p.score + (100 * (p.streak + 1)), streak: p.streak + 1, playerHp: Math.min(p.maxPlayerHp, p.playerHp + 5), enemyHp: 0 })); setShowFeedback(true);
    } else {
      playFailureSound();
      triggerFloatingText("Miss", "miss"); setSelectedWrongIds(prev => [...prev, opt.id]);
      setGameState(p => ({ ...p, streak: 0, playerHp: Math.max(0, p.playerHp - 15) }));
      if (!wrongIdioms.find(r => r.idiom.id === q.id && r.mode === gameMode)) setWrongIdioms(prev => [...prev, { idiom: q, mode: gameMode }]);
      if (gameState.playerHp - 15 <= 0) setGameState(p => ({ ...p, status: 'DEFEAT' }));
    }
  };

  const handleFeedbackNext = () => {
    setShowFeedback(false); setWorldMonsters(prev => prev.map(m => m.id === currentMonsterId ? { ...m, isDefeated: true } : m));
    if (worldMonsters.filter(m => !m.isDefeated && m.id !== currentMonsterId).length === 0) { setGameState(p => ({ ...p, status: 'EXPLORING' })); startCelebration(); }
    else setGameState(p => ({ ...p, status: 'EXPLORING' }));
  };

  const renderMenu = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-50 p-4">
      <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 mb-2 text-center">IDIOM QUEST 3D</div>
      <div className="bg-slate-800/80 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full backdrop-blur-md">
        <div className="flex bg-slate-900 rounded-lg p-1 mb-6">
          <button onClick={() => setIsCustomMode(false)} className={`flex-1 py-2 rounded-md font-bold ${!isCustomMode ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Built-in</button>
          <button onClick={() => setIsCustomMode(true)} className={`flex-1 py-2 rounded-md font-bold ${isCustomMode ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Custom</button>
        </div>
        {isCustomMode && <input type="text" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="URL..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 mb-4 text-white font-mono text-sm" />}
        <div className="flex gap-3 justify-center mb-6">{[5, 10, 15].map(c => <button key={c} onClick={() => setSelectedMonsterCount(c)} className={`w-12 h-12 rounded-full border-2 ${selectedMonsterCount === c ? 'bg-yellow-500 border-yellow-300 text-black' : 'bg-slate-700 border-slate-600'}`}>{c}</button>)}</div>
        <div className="space-y-3">
          <Button className="w-full" size="lg" onClick={() => startGame('DEF_TO_IDIOM')}>Def → Idiom</Button>
          <Button className="w-full bg-indigo-600" size="lg" onClick={() => startGame('IDIOM_TO_DEF')}>Idiom → Def</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen bg-slate-900 relative font-sans text-slate-100 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [0, 20, 20], fov: 50 }}>
          <World playerPos={playerPos} monsters={worldMonsters} props={worldProps} onPlayerMove={handlePlayerMove} isBattling={gameState.status === 'BATTLE'} isCelebration={isCelebration} />
        </Canvas>
      </div>

      <FloatingTextDisplay items={floatingTexts} />

      {isCelebration && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
          <button onClick={endCelebrationEarly} className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold shadow-xl transition-all hover:scale-105 active:scale-95 group">
            <FastForward className="w-4 h-4" />
            <span>跳過表演 Skip Performance</span>
          </button>
        </div>
      )}

      {gameState.status === 'MENU' && renderMenu()}
      {gameState.status === 'BATTLE' && (
        <div className="absolute inset-0 flex flex-col z-40 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          {showFeedback ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="bg-slate-800 border-2 border-green-500 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="bg-green-600 p-4 text-center text-white text-2xl font-black">CORRECT!</div>
                <div className="p-6 text-center space-y-4">
                  <h3 className="text-4xl font-black text-yellow-400">{gameQueue[currentMonsterId!]?.word}</h3>
                  <p className="text-slate-300">{gameQueue[currentMonsterId!]?.definition}</p>
                  <div className="bg-slate-900 p-4 rounded-xl text-left italic text-slate-400">{gameQueue[currentMonsterId!]?.example}</div>
                </div>
                <div className="p-4"><Button className="w-full" onClick={handleFeedbackNext}>Next</Button></div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between p-4 bg-gradient-to-b from-black/50 to-transparent shrink-0">
                <HealthBar current={gameState.playerHp} max={gameState.maxPlayerHp} label="Player" isPlayer />
                <button onClick={() => setGameState(p => ({ ...p, status: 'EXPLORING' }))} className="bg-red-500 px-4 py-1 rounded-full text-xs font-bold">Run</button>
                <HealthBar current={gameState.enemyHp} max={gameState.maxEnemyHp} label="Monster" color="bg-red-500" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
                <div className="bg-slate-800/90 border-2 border-yellow-500/40 rounded-xl p-6 shadow-2xl max-w-2xl w-full text-center">
                  <h2 className="text-slate-500 text-xs font-bold uppercase mb-2">Identify</h2>
                  <div className="text-2xl font-black">{gameMode === 'DEF_TO_IDIOM' ? gameQueue[currentMonsterId!]?.definition : gameQueue[currentMonsterId!]?.word}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                  {currentOptions.map(opt => (
                    <Button key={opt.id} variant="secondary" onClick={() => handleAttack(opt)} disabled={selectedWrongIds.includes(opt.id)} className={`py-6 ${selectedWrongIds.includes(opt.id) ? 'opacity-20' : ''}`}>
                      {gameMode === 'DEF_TO_IDIOM' ? opt.word : opt.definition}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {(gameState.status === 'VICTORY' || gameState.status === 'DEFEAT') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-2xl border-4 border-slate-600 text-center shadow-2xl">
            {gameState.status === 'VICTORY' ? <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4 animate-bounce" /> : <Skull className="w-24 h-24 text-red-500 mx-auto mb-4" />}
            <h2 className={`text-5xl font-black mb-2 ${gameState.status === 'VICTORY' ? 'text-yellow-400' : 'text-red-500'}`}>{gameState.status}</h2>
            <div className="text-2xl mb-8 font-bold">Score: {gameState.score}</div>
            <div className="flex gap-4"><Button onClick={() => setGameState(p => ({ ...p, status: 'MENU' }))} variant="secondary">Menu</Button><Button onClick={() => startGame(gameMode)}>Replay</Button></div>
          </div>
        </div>
      )}

      {gameState.status === 'EXPLORING' && !isCelebration && (
        <>
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-600 font-bold text-yellow-400 flex items-center gap-2"><Trophy className="w-5 h-5" /> Score: {gameState.score}</div>
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-600 font-bold text-red-400 flex items-center gap-2"><Skull className="w-5 h-5" /> Monsters: {worldMonsters.filter(m => !m.isDefeated).length}</div>
          </div>
          <div className="absolute top-4 right-4 z-10">
            <button onClick={() => setGameState(p => ({ ...p, status: 'MENU' }))} className="bg-slate-800/80 p-3 rounded-xl border border-slate-600"><LogOut className="w-6 h-6" /></button>
          </div>
          {/* Virtual Controls */}
          <div className="absolute bottom-4 left-4 z-30 scale-90 origin-bottom-left grid grid-cols-3 gap-2">
            <div /><button className="w-14 h-14 bg-white/10 rounded-full border border-white/20" onPointerDown={() => (window as any).setVirtualControl('up', true)} onPointerUp={() => (window as any).setVirtualControl('up', false)}><ArrowUp className="mx-auto" /></button><div />
            <button className="w-14 h-14 bg-white/10 rounded-full border border-white/20" onPointerDown={() => (window as any).setVirtualControl('left', true)} onPointerUp={() => (window as any).setVirtualControl('left', false)}><ArrowLeft className="mx-auto" /></button>
            <div />
            <button className="w-14 h-14 bg-white/10 rounded-full border border-white/20" onPointerDown={() => (window as any).setVirtualControl('right', true)} onPointerUp={() => (window as any).setVirtualControl('right', false)}><ArrowRight className="mx-auto" /></button>
            <div /><button className="w-14 h-14 bg-white/10 rounded-full border border-white/20" onPointerDown={() => (window as any).setVirtualControl('down', true)} onPointerUp={() => (window as any).setVirtualControl('down', false)}><ArrowDown className="mx-auto" /></button><div />
          </div>
          <div className="absolute bottom-4 right-4 z-30 scale-90 origin-bottom-right grid grid-cols-3 gap-2">
            <div /><button className="w-14 h-14 bg-white/10 rounded-full border border-white/20" onPointerDown={() => (window as any).setVirtualControl('rotateUp', true)} onPointerUp={() => (window as any).setVirtualControl('rotateUp', false)}><ChevronUp className="mx-auto" /></button><div />
            <button className="w-14 h-14 bg-white/10 rounded-full border border-white/20" onPointerDown={() => (window as any).setVirtualControl('rotateLeft', true)} onPointerUp={() => (window as any).setVirtualControl('rotateLeft', false)}><ChevronLeft className="mx-auto" /></button>
            <div />
            <button className="w-14 h-14 bg-white/10 rounded-full border border-white/20" onPointerDown={() => (window as any).setVirtualControl('rotateRight', true)} onPointerUp={() => (window as any).setVirtualControl('rotateRight', false)}><ChevronRight className="mx-auto" /></button>
            <div /><button className="w-14 h-14 bg-white/10 rounded-full border border-white/20" onPointerDown={() => (window as any).setVirtualControl('rotateDown', true)} onPointerUp={() => (window as any).setVirtualControl('rotateDown', false)}><ChevronDown className="mx-auto" /></button><div />
          </div>
        </>
      )}
      <ReloadPrompt />
    </div>
  );
}

