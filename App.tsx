import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Text, useFont } from '@react-three/drei';
import * as THREE from 'three';
import { ALL_IDIOMS } from './data/idioms';
import { Idiom, GameState, FloatingText, WorldMonster, GameMode, WrongRecord } from './types';
import { Button } from './components/Button';
import { HealthBar } from './components/HealthBar';
import { FloatingTextDisplay } from './components/FloatingTextDisplay';
import { Sword, Trophy, Zap, RefreshCw, Skull, Map as MapIcon, Compass, BookOpen, X, List, Rotate3D, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2, Library, LogOut, Users, Swords, Link as LinkIcon, AlertCircle, Loader2, FileJson, Copy, Check } from 'lucide-react';

// Fix for missing types in JSX.IntrinsicElements when using @react-three/fiber
// We augment both global JSX and React module JSX to ensure compatibility with different TS configurations
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      planeGeometry: any;
      cylinderGeometry: any;
      coneGeometry: any;
      ambientLight: any;
      directionalLight: any;
      gridHelper: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      planeGeometry: any;
      cylinderGeometry: any;
      coneGeometry: any;
      ambientLight: any;
      directionalLight: any;
      gridHelper: any;
    }
  }
}

const INITIAL_PLAYER_HP = 100;
const INITIAL_ENEMY_HP = 100; // Increased HP since they take 2 hits now
const STORAGE_KEY_WRONG_RECORDS = 'idiom-quest-wrong-records-v2';

const EXAMPLE_JSON_CONTENT = `[
  {
    "word": "一石二鳥",
    "definition": "比喻做一件事獲得兩種效果。"
  },
  {
    "word": "三心二意",
    "definition": "形容意志不堅定，猶豫不決。"
  },
  {
    "word": "井底之蛙",
    "definition": "比喻見識淺薄的人。"
  },
  {
    "word": "守株待兔",
    "definition": "比喻拘泥守成，不知變通或妄想不勞而獲。"
  },
  {
    "word": "畫蛇添足",
    "definition": "比喻多此一舉，反將事情弄糟。"
  }
]`;

// Utility to get random items
const getRandomItems = <T,>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// --- AUDIO UTILS ---

const playExplosionSound = () => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  const ctx = new AudioContext();
  const t = ctx.currentTime;

  // 1. Low frequency "Thud" (Oscillator)
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, t);
  osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
  
  oscGain.gain.setValueAtTime(0.5, t);
  oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
  
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.5);

  // 2. Crackle/Noise (Buffer)
  const bufferSize = ctx.sampleRate * 1.5; // 1.5 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(1000, t);
  noiseFilter.frequency.linearRampToValueAtTime(100, t + 1);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(t);
  noise.stop(t + 1.5);
};

// --- CONTROLS UTILS ---

const triggerKeyEvent = (code: string, type: 'keydown' | 'keyup') => {
  const event = new KeyboardEvent(type, { code, bubbles: true });
  window.dispatchEvent(event);
};

const DPadButton = ({ code, label, icon: Icon, className }: any) => (
  <button
    className={`w-14 h-14 bg-slate-800/60 backdrop-blur-md border border-slate-500/50 rounded-xl flex items-center justify-center text-white active:bg-blue-600 active:scale-95 transition-all touch-none select-none shadow-lg ${className}`}
    onPointerDown={(e) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      triggerKeyEvent(code, 'keydown');
    }}
    onPointerUp={(e) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      triggerKeyEvent(code, 'keyup');
    }}
    onPointerLeave={(e) => {
       triggerKeyEvent(code, 'keyup');
    }}
    onContextMenu={(e) => e.preventDefault()}
  >
    {Icon ? <Icon size={28} /> : <span className="font-bold text-xl">{label}</span>}
  </button>
);

const MobileControls = () => (
  <div className="absolute inset-x-0 bottom-4 px-4 flex justify-between items-end pointer-events-none z-50">
    {/* Left: WASD Movement */}
    <div className="pointer-events-auto grid grid-cols-3 gap-2">
      <div />
      <DPadButton code="KeyW" label="W" />
      <div />
      <DPadButton code="KeyA" label="A" />
      <DPadButton code="KeyS" label="S" />
      <DPadButton code="KeyD" label="D" />
    </div>

    {/* Right: Camera Controls */}
    <div className="pointer-events-auto grid grid-cols-3 gap-2">
      <div />
      <DPadButton code="ArrowUp" icon={ChevronUp} />
      <div />
      <DPadButton code="ArrowLeft" icon={ChevronLeft} />
      <DPadButton code="ArrowDown" icon={ChevronDown} />
      <DPadButton code="ArrowRight" icon={ChevronRight} />
    </div>
  </div>
);

// --- 3D COMPONENTS ---

const PlayerModel = ({ position, targetRotation, isMoving }: { position: [number, number, number], targetRotation: number, isMoving: boolean }) => {
  const group = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!group.current) return;
    
    // Smooth position update
    group.current.position.lerp(new THREE.Vector3(...position), 0.2);
    
    // Smooth rotation update (shortest path interpolation)
    const currentRot = group.current.rotation.y;
    let diff = targetRotation - currentRot;
    // Normalize to -PI to +PI
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    group.current.rotation.y += diff * 0.15;

    // Bobbing / Walking animation
    if (isMoving) {
      const time = state.clock.getElapsedTime() * 10;
      if(leftLeg.current) leftLeg.current.rotation.x = Math.sin(time) * 0.5;
      if(rightLeg.current) rightLeg.current.rotation.x = Math.cos(time) * 0.5;
      if(leftArm.current) leftArm.current.rotation.x = Math.cos(time) * 0.5;
      if(rightArm.current) rightArm.current.rotation.x = Math.sin(time) * 0.5;
    } else {
       if(leftLeg.current) leftLeg.current.rotation.x = 0;
       if(rightLeg.current) rightLeg.current.rotation.x = 0;
       if(leftArm.current) leftArm.current.rotation.x = 0;
       if(rightArm.current) rightArm.current.rotation.x = 0;
    }
  });

  return (
    <group ref={group} dispose={null}>
      {/* Head */}
      <mesh position={[0, 1.7, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#facc15" /> {/* Roblox Yellow */}
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.4]} />
        <meshStandardMaterial color="#3b82f6" /> {/* Blue Shirt */}
      </mesh>
      {/* Left Arm */}
      <mesh ref={leftArm} position={[-0.6, 1.1, 0]} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.4]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      {/* Right Arm */}
      <mesh ref={rightArm} position={[0.6, 1.1, 0]} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.4]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      {/* Left Leg */}
      <mesh ref={leftLeg} position={[-0.2, 0.3, 0]} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.4]} />
        <meshStandardMaterial color="#22c55e" /> {/* Green Pants */}
      </mesh>
      {/* Right Leg */}
      <mesh ref={rightLeg} position={[0.2, 0.3, 0]} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.4]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  );
};

const Monster3D = ({ monster }: { monster: WorldMonster }) => {
  const group = useRef<THREE.Group>(null);
  const limbs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    if (group.current) {
      // Idle rotation
      group.current.rotation.y += 0.005;
      
      // Floating / Breathing effect
      group.current.position.y = Math.sin(state.clock.getElapsedTime() * 2 + monster.id) * 0.1;
      
      // Animate limbs
      const t = state.clock.getElapsedTime() * 5;
      limbs.current.forEach((limb, i) => {
        if (limb) {
          limb.rotation.x = Math.sin(t + i) * 0.3;
        }
      });
    }
  });

  return (
    <group ref={group} position={[monster.x, 0, monster.z]}>
      {monster.bodyType === 'biped' ? (
        // --- 2 LEGS (Biped) ---
        <group position={[0, 0, 0]}>
          {/* Head */}
          <mesh position={[0, 1.8, 0]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={monster.color} />
            {/* Eyes */}
            <mesh position={[0.15, 0.05, 0.26]}>
               <planeGeometry args={[0.1, 0.1]} />
               <meshBasicMaterial color="black" />
            </mesh>
            <mesh position={[-0.15, 0.05, 0.26]}>
               <planeGeometry args={[0.1, 0.1]} />
               <meshBasicMaterial color="black" />
            </mesh>
          </mesh>
          {/* Torso */}
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[0.7, 0.8, 0.4]} />
            <meshStandardMaterial color={monster.color} opacity={0.9} transparent />
          </mesh>
          {/* Left Arm */}
          <mesh ref={el => limbs.current[0] = el} position={[-0.5, 1.1, 0]} castShadow>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color={monster.color} />
          </mesh>
          {/* Right Arm */}
          <mesh ref={el => limbs.current[1] = el} position={[0.5, 1.1, 0]} castShadow>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color={monster.color} />
          </mesh>
          {/* Left Leg */}
          <mesh ref={el => limbs.current[2] = el} position={[-0.2, 0.4, 0]} castShadow>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          {/* Right Leg */}
          <mesh ref={el => limbs.current[3] = el} position={[0.2, 0.4, 0]} castShadow>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
      ) : (
        // --- 4 LEGS (Quadruped) ---
        <group position={[0, 0, 0]}>
           {/* Body (Horizontal) */}
           <mesh position={[0, 0.8, 0]} castShadow>
             <boxGeometry args={[0.8, 0.6, 1.2]} />
             <meshStandardMaterial color={monster.color} />
           </mesh>
           {/* Head */}
           <mesh position={[0, 1.3, 0.6]} castShadow>
             <boxGeometry args={[0.5, 0.5, 0.5]} />
             <meshStandardMaterial color={monster.color} />
             {/* Eyes */}
             <mesh position={[0.15, 0.0, 0.26]}>
               <planeGeometry args={[0.1, 0.1]} />
               <meshBasicMaterial color="red" />
             </mesh>
             <mesh position={[-0.15, 0.0, 0.26]}>
               <planeGeometry args={[0.1, 0.1]} />
               <meshBasicMaterial color="red" />
             </mesh>
           </mesh>
           {/* Legs */}
           <mesh ref={el => limbs.current[0] = el} position={[-0.3, 0.3, 0.4]} castShadow>
             <boxGeometry args={[0.25, 0.6, 0.25]} />
             <meshStandardMaterial color="#1f2937" />
           </mesh>
           <mesh ref={el => limbs.current[1] = el} position={[0.3, 0.3, 0.4]} castShadow>
             <boxGeometry args={[0.25, 0.6, 0.25]} />
             <meshStandardMaterial color="#1f2937" />
           </mesh>
           <mesh ref={el => limbs.current[2] = el} position={[-0.3, 0.3, -0.4]} castShadow>
             <boxGeometry args={[0.25, 0.6, 0.25]} />
             <meshStandardMaterial color="#1f2937" />
           </mesh>
           <mesh ref={el => limbs.current[3] = el} position={[0.3, 0.3, -0.4]} castShadow>
             <boxGeometry args={[0.25, 0.6, 0.25]} />
             <meshStandardMaterial color="#1f2937" />
           </mesh>
        </group>
      )}

      {/* Health Bar / Nameplate Mockup */}
      <mesh position={[0, 2.5, 0]}>
         <planeGeometry args={[2, 0.5]} />
         <meshBasicMaterial color="black" opacity={0.5} transparent />
      </mesh>
    </group>
  );
};

// --- FIREWORKS ---

const Firework = ({ position, color, onComplete }: { position: [number, number, number], color: string, onComplete: () => void }) => {
  const particleCount = 20;
  const particles = useMemo(() => {
    return new Array(particleCount).fill(0).map(() => ({
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ).normalize().multiplyScalar(Math.random() * 0.5),
      offset: new THREE.Vector3(0,0,0)
    }));
  }, []);
  
  const group = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());

  useFrame(() => {
    if (!group.current) return;
    const elapsed = (Date.now() - startTime.current) / 1000;
    
    if (elapsed > 1.5) {
      onComplete();
      return;
    }

    group.current.children.forEach((child, i) => {
      const p = particles[i];
      p.offset.add(p.velocity);
      p.velocity.y -= 0.01; // Gravity
      
      child.position.set(p.offset.x, p.offset.y, p.offset.z);
      child.scale.setScalar(Math.max(0, 1 - elapsed / 1.5));
    });
  });

  return (
    <group ref={group} position={position}>
      {particles.map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
};

const FireworksDisplay = () => {
  const [fireworks, setFireworks] = useState<{id: number, x: number, y: number, z: number, color: string}[]>([]);

  useFrame((state) => {
    // Randomly spawn fireworks - slight increase to 0.08 for better effect
    if (Math.random() < 0.08) { 
      const id = Date.now() + Math.random();
      const x = (Math.random() - 0.5) * 60;
      // Low altitude: 2 to 12
      const y = 2 + Math.random() * 10;
      const z = (Math.random() - 0.5) * 60;
      // Rainbow colors: Red, Orange, Yellow, Green, Blue, Indigo, Violet
      const colors = ['#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#4b0082', '#ee82ee'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      setFireworks(prev => [...prev, { id, x, y, z, color }]);
      playExplosionSound();
    }
  });

  const removeFirework = (id: number) => {
    setFireworks(prev => prev.filter(fw => fw.id !== id));
  };

  return (
    <>
      {fireworks.map(fw => (
        <Firework 
          key={fw.id} 
          position={[fw.x, fw.y, fw.z]} 
          color={fw.color} 
          onComplete={() => removeFirework(fw.id)} 
        />
      ))}
    </>
  );
};

const World = ({ 
  monsters, 
  onEncounter, 
  playerPosition, 
  setPlayerPosition,
  isBattling,
  isCelebration
}: { 
  monsters: WorldMonster[], 
  onEncounter: (m: WorldMonster) => void,
  playerPosition: [number, number, number],
  setPlayerPosition: (pos: [number, number, number]) => void,
  isBattling: boolean,
  isCelebration: boolean
}) => {
  const { camera } = useThree();
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const isMoving = useRef(false);
  
  // Static Sun Position: High up, angled for good shadows
  const sunPosition: [number, number, number] = [50, 150, 50];

  // Camera State
  const cameraState = useRef({ yaw: 0, pitch: 0.5, distance: 12 });
  // Player rotation separate from camera, updates when moving
  const playerRotation = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: true }));
    const handleKeyUp = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: false }));
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state) => {
    // 1. Camera Orbit Control (Arrow Keys)
    const rotSpeed = 0.03;
    
    // Left/Right arrows rotate camera around player (Yaw)
    if (keys['ArrowLeft']) cameraState.current.yaw += rotSpeed;
    if (keys['ArrowRight']) cameraState.current.yaw -= rotSpeed;
    
    // Up/Down arrows change camera height/angle (Pitch)
    if (keys['ArrowUp']) cameraState.current.pitch = Math.min(Math.PI / 2 - 0.1, cameraState.current.pitch + rotSpeed);
    if (keys['ArrowDown']) cameraState.current.pitch = Math.max(0.1, cameraState.current.pitch - rotSpeed);

    // Update Camera Position
    const { yaw, pitch, distance } = cameraState.current;
    const camX = playerPosition[0] + distance * Math.sin(yaw) * Math.cos(pitch);
    const camY = playerPosition[1] + distance * Math.sin(pitch);
    const camZ = playerPosition[2] + distance * Math.cos(yaw) * Math.cos(pitch);

    const targetPos = new THREE.Vector3(camX, camY, camZ);
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(playerPosition[0], playerPosition[1] + 1.5, playerPosition[2]);

    if (isBattling) {
      isMoving.current = false;
      return;
    }

    // 2. Player Movement Control (WASD) - Relative to Camera View
    const moveSpeed = 0.2;
    let dx = 0;
    let dz = 0;

    // Get Camera Direction Vectors
    const frontVector = new THREE.Vector3();
    camera.getWorldDirection(frontVector);
    frontVector.y = 0; // flatten to ground
    frontVector.normalize();

    const rightVector = new THREE.Vector3();
    rightVector.crossVectors(frontVector, camera.up).normalize();

    if (keys['KeyW']) { 
      dx += frontVector.x; 
      dz += frontVector.z; 
    }
    if (keys['KeyS']) { 
      dx -= frontVector.x; 
      dz -= frontVector.z; 
    }
    if (keys['KeyD']) { 
      dx += rightVector.x; 
      dz += rightVector.z; 
    }
    if (keys['KeyA']) { 
      dx -= rightVector.x; 
      dz -= rightVector.z; 
    }

    // Normalize diagonal movement
    if (dx !== 0 || dz !== 0) {
      const length = Math.sqrt(dx*dx + dz*dz);
      dx = (dx / length) * moveSpeed;
      dz = (dz / length) * moveSpeed;
      
      isMoving.current = true;
      // Calculate rotation to face movement direction
      playerRotation.current = Math.atan2(dx, dz);
    } else {
      isMoving.current = false;
    }

    if (isMoving.current) {
      const newX = playerPosition[0] + dx;
      const newZ = playerPosition[2] + dz;
      
      // Boundary checks
      if (newX > -48 && newX < 48 && newZ > -48 && newZ < 48) {
        setPlayerPosition([newX, playerPosition[1], newZ]);
      }
    }

    // Collision Detection
    monsters.forEach(m => {
      if (!m.isDefeated) {
        const dist = Math.sqrt(Math.pow(m.x - playerPosition[0], 2) + Math.pow(m.z - playerPosition[2], 2));
        if (dist < 2) {
          onEncounter(m);
        }
      }
    });
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={sunPosition} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0005}
      />
      <Sky sunPosition={sunPosition} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Celebration Fireworks */}
      {isCelebration && <FireworksDisplay />}

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#4ade80" /> {/* Grass Green */}
      </mesh>

      {/* Grid Pattern */}
      <gridHelper args={[100, 50, 0xffffff, 0xffffff]} position={[0, 0.01, 0]} />

      {/* Player Model with Rotation */}
      <PlayerModel 
        position={playerPosition} 
        targetRotation={playerRotation.current}
        isMoving={isMoving.current && !isBattling} 
      />

      {monsters.map(m => !m.isDefeated && (
        <Monster3D key={m.id} monster={m} />
      ))}
      
      {/* Decorations */}
      {[...Array(20)].map((_, i) => {
        const x = Math.sin(i * 123) * 40;
        const z = Math.cos(i * 321) * 40;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 1, 0]} castShadow>
               <cylinderGeometry args={[0.5, 0.5, 2]} />
               <meshStandardMaterial color="#78350f" />
            </mesh>
            <mesh position={[0, 3, 0]} castShadow>
               <coneGeometry args={[2, 4]} />
               <meshStandardMaterial color="#14532d" />
            </mesh>
          </group>
        )
      })}
    </>
  );
};

// --- APP COMPONENT ---

export default function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>({
    playerHp: INITIAL_PLAYER_HP,
    maxPlayerHp: INITIAL_PLAYER_HP,
    enemyHp: INITIAL_ENEMY_HP,
    maxEnemyHp: INITIAL_ENEMY_HP,
    score: 0,
    streak: 0,
    level: 1,
    status: 'MENU',
  });
  
  const [gameMode, setGameMode] = useState<GameMode>('DEF_TO_IDIOM');
  const [selectedMonsterCount, setSelectedMonsterCount] = useState<5 | 10 | 15>(5);

  // Custom Data State
  const [activeDataset, setActiveDataset] = useState<Idiom[]>(ALL_IDIOMS);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // World State
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [monsters, setMonsters] = useState<WorldMonster[]>([]);
  const [currentMonsterId, setCurrentMonsterId] = useState<number | null>(null);
  const [isCelebration, setIsCelebration] = useState(false);

  // Round State
  const [gameQueue, setGameQueue] = useState<Idiom[]>([]); // The questions for this session
  const [battlePhase, setBattlePhase] = useState<0 | 1>(0); // 0 = First question, 1 = Second question
  const [currentIdiom, setCurrentIdiom] = useState<Idiom | null>(null);
  const [options, setOptions] = useState<Idiom[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [disabledOptionIds, setDisabledOptionIds] = useState<string[]>([]); // Track incorrect options for current round
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Learning State (Persisted)
  const [wrongRecords, setWrongRecords] = useState<WrongRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WRONG_RECORDS);
      if (saved) {
        return JSON.parse(saved);
      }
      return [];
    } catch (e) {
      console.error("Failed to load idioms", e);
      return [];
    }
  });
  const [showWrongList, setShowWrongList] = useState(false);
  const [reviewTab, setReviewTab] = useState<GameMode>('DEF_TO_IDIOM');
  
  // Visual Effects State
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [shakeScreen, setShakeScreen] = useState(false);

  // --- Persistence Effect ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WRONG_RECORDS, JSON.stringify(wrongRecords));
  }, [wrongRecords]);

  const clearWrongHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Clear only for the current active tab mode
    const newRecords = wrongRecords.filter(r => r.mode !== reviewTab);
    setWrongRecords(newRecords);
  };

  const handleCopyExample = useCallback(() => {
    navigator.clipboard.writeText(EXAMPLE_JSON_CONTENT).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }, []);

  // --- Logic ---

  const initWorld = (count: number) => {
    const newMonsters: WorldMonster[] = [];
    
    for (let i = 0; i < count; i++) {
       // Random position within -40 to 40
       const x = (Math.random() - 0.5) * 80;
       const z = (Math.random() - 0.5) * 80;
       
       const colors = ['#ef4444', '#a855f7', '#f97316', '#ec4899'];
       // Alternate body types
       const bodyType: 'biped' | 'quadruped' = i % 2 === 0 ? 'biped' : 'quadruped';

       // Avoid spawning too close to origin (player start)
       if (Math.abs(x) < 5 && Math.abs(z) < 5) {
         newMonsters.push({
           id: i,
           x: x + 10,
           z: z + 10,
           level: 1,
           isDefeated: false,
           color: colors[i % colors.length],
           bodyType
         });
         continue;
       }

       newMonsters.push({
         id: i,
         x,
         z,
         level: 1,
         isDefeated: false,
         color: colors[i % colors.length],
         bodyType
       });
    }
    setMonsters(newMonsters);
    setPlayerPosition([0, 0, 0]);
  };

  const startCelebration = () => {
    setIsCelebration(true);
    playExplosionSound();
    
    // Celebration lasts 15 seconds, then goes to Victory screen
    setTimeout(() => {
      setIsCelebration(false);
      setGameState(currentState => ({
        ...currentState,
        status: 'VICTORY',
      }));
    }, 15000);
  };

  const fetchAndValidateCustomData = async (url: string): Promise<Idiom[]> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Network Error: ${response.statusText}`);
    }
    
    let jsonData;
    try {
      jsonData = await response.json();
    } catch (e) {
      throw new Error('Failed to parse JSON. Please check the file format.');
    }

    if (!Array.isArray(jsonData)) {
      throw new Error('JSON data must be an array of objects.');
    }

    const result: Idiom[] = jsonData.map((item: any, index: number) => {
      // Flexible mapping: 'word' or 'idiom', 'definition' or 'meaning'
      const word = item.word || item.idiom || item.term;
      const definition = item.definition || item.meaning || item.description || item.def;
      
      if (!word || !definition) return null;

      return {
        id: item.id ? String(item.id) : `custom_${index}_${Math.random().toString(36).substr(2, 5)}`,
        word: String(word),
        definition: String(definition)
      };
    }).filter((item): item is Idiom => item !== null);
    
    if (result.length < 5) {
      throw new Error('JSON contains fewer than 5 valid items (requires "word" and "definition" fields).');
    }
    return result;
  };

  const startGame = async (mode: GameMode) => {
    setMenuError(null);
    let datasetToUse = activeDataset;

    // Handle Custom Data Loading
    if (isCustomMode) {
      if (!customUrl.trim()) {
        setMenuError("Please enter a valid URL.");
        return;
      }
      setIsLoading(true);
      try {
        datasetToUse = await fetchAndValidateCustomData(customUrl);
        setActiveDataset(datasetToUse);
      } catch (err: any) {
        setMenuError(`Failed to load data: ${err.message}`);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    } else {
      // Revert to builtin if not custom
      datasetToUse = ALL_IDIOMS;
      setActiveDataset(ALL_IDIOMS);
    }

    setGameMode(mode);
    setReviewTab(mode); // Set review tab to match current game mode for convenience
    
    const totalQuestions = selectedMonsterCount * 2;

    // --- Generate Question Queue ---
    // 1. Get unique wrong idioms for this mode
    // Note: We only use wrong records if we are in builtin mode OR if we want to support cross-dataset mistakes.
    // For simplicity, let's assume wrong records persist but might reference IDs not in custom set.
    // We filter mistakes to only include ones present in the current dataset to avoid errors.
    const uniqueMistakesMap = new Map();
    wrongRecords
      .filter(r => r.mode === mode)
      .filter(r => datasetToUse.some(d => d.id === r.idiom.id)) // Only keep mistakes valid in current dataset
      .forEach(r => {
        uniqueMistakesMap.set(r.idiom.id, r.idiom);
      });
    const mistakeIdioms = Array.from(uniqueMistakesMap.values()) as Idiom[];
    
    // 2. Select from mistakes
    let selectedQueue: Idiom[] = [];
    if (mistakeIdioms.length >= totalQuestions) {
        // We have enough mistakes to fill the entire game
        selectedQueue = getRandomItems(mistakeIdioms, totalQuestions);
    } else {
        // Use all mistakes, then fill the rest from the ACTIVE dataset
        selectedQueue = [...mistakeIdioms];
        const needed = totalQuestions - selectedQueue.length;
        
        const existingIds = new Set(selectedQueue.map(i => i.id));
        const pool = datasetToUse.filter(i => !existingIds.has(i.id));
        
        // Check if pool is large enough
        if (pool.length < needed && pool.length > 0) {
            // If not enough unique items, just repeat some
            const fillers = [];
            for(let i=0; i<needed; i++) {
                fillers.push(pool[i % pool.length]);
            }
            selectedQueue = [...selectedQueue, ...fillers];
        } else if (pool.length > 0) {
             const fillers = getRandomItems(pool, needed);
             selectedQueue = [...selectedQueue, ...fillers];
        } else {
             // Fallback if dataset is tiny (e.g. 5 items total)
             const fillers = [];
             for(let i=0; i<needed; i++) {
                 fillers.push(datasetToUse[i % datasetToUse.length]);
             }
             selectedQueue = [...selectedQueue, ...fillers];
        }
    }
    
    // 3. Final shuffle to mix mistakes and new ones
    selectedQueue = getRandomItems(selectedQueue, totalQuestions);
    setGameQueue(selectedQueue);

    initWorld(selectedMonsterCount);
    
    setGameState({
      playerHp: INITIAL_PLAYER_HP,
      maxPlayerHp: INITIAL_PLAYER_HP,
      enemyHp: INITIAL_ENEMY_HP,
      maxEnemyHp: INITIAL_ENEMY_HP,
      score: 0,
      streak: 0,
      level: 1,
      status: 'EXPLORING',
    });
    setFloatingTexts([]);
    setIsCelebration(false);
  };

  const addFloatingText = (text: string, type: FloatingText['type'], x: number, y: number) => {
    const id = Date.now();
    setFloatingTexts(prev => [...prev, { id, text, type, x, y }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 1000);
  };

  const setupRound = useCallback(() => {
    // Determine target based on which monster we are fighting AND which phase
    // currentMonsterId corresponds to the monster
    // Each monster has 2 questions.
    // Index = (currentMonsterId * 2) + battlePhase
    if (currentMonsterId === null) return;

    const questionIndex = (currentMonsterId * 2) + battlePhase;
    const target = gameQueue[questionIndex] || activeDataset[0]; // Fallback safe
    
    const distractors = getRandomItems(
      activeDataset.filter(i => i.id !== target.id),
      3
    );
    // If not enough distractors (small dataset), duplicate or handle gracefully
    while(distractors.length < 3 && activeDataset.length > 1) {
        distractors.push(activeDataset.filter(i => i.id !== target.id)[0]);
    }

    const roundOptions = getRandomItems([target, ...distractors], 4);
    
    setCurrentIdiom(target);
    setOptions(roundOptions);
    setSelectedOptionId(null);
    setDisabledOptionIds([]); // Reset disabled options
    setIsProcessing(false);
  }, [gameQueue, currentMonsterId, battlePhase, activeDataset]);

  const handleEncounter = (monster: WorldMonster) => {
    setCurrentMonsterId(monster.id);
    setBattlePhase(0); // Start at first question for this monster
    
    // Force update logic for first question using activeDataset
    const questionIndex = (monster.id * 2) + 0;
    const target = gameQueue[questionIndex] || activeDataset[0];
    let distractors = getRandomItems(activeDataset.filter(i => i.id !== target.id), 3);
    while(distractors.length < 3 && activeDataset.length > 1) {
        distractors.push(activeDataset.filter(i => i.id !== target.id)[0]);
    }

    const roundOptions = getRandomItems([target, ...distractors], 4);
    
    setCurrentIdiom(target);
    setOptions(roundOptions);
    setSelectedOptionId(null);
    setDisabledOptionIds([]);
    setIsProcessing(false);

    // Initial Monster HP
    setGameState(prev => ({
      ...prev,
      status: 'BATTLE',
      enemyHp: INITIAL_ENEMY_HP,
      maxEnemyHp: INITIAL_ENEMY_HP,
    }));
  };

  const handleRunAway = () => {
    setGameState(prev => ({ ...prev, status: 'EXPLORING' }));
    setBattlePhase(0);
    // Move player back slightly
    setPlayerPosition(prev => [prev[0], prev[1], prev[2] + 2]);
    addFloatingText('Escaped!', 'miss', 50, 50);
  };

  // Used to trigger setupRound after phase change
  useEffect(() => {
    if (gameState.status === 'BATTLE' && currentMonsterId !== null) {
        setupRound();
    }
  }, [battlePhase]);

  const handleAttack = (optionId: string) => {
    if (isProcessing || gameState.status !== 'BATTLE' || disabledOptionIds.includes(optionId)) return;
    
    setIsProcessing(true);
    setSelectedOptionId(optionId);

    if (optionId === currentIdiom?.id) {
      // Correct Answer
      setTimeout(() => {
        const baseDamage = 50; // 2 hits to kill (100 HP total)
        const totalDamage = baseDamage;

        setShakeScreen(true);
        setTimeout(() => setShakeScreen(false), 500);

        addFloatingText(totalDamage.toString(), 'damage', 70, 30);

        setGameState(prev => {
          const newHp = Math.max(0, prev.enemyHp - totalDamage);
          return {
            ...prev,
            enemyHp: newHp,
            score: prev.score + 100 + (prev.streak * 10),
            streak: prev.streak + 1,
          };
        });

        setTimeout(() => {
            // Check Phase
            if (battlePhase === 0) {
                 // First Question Done, monster hurt but not dead (visually we keep HP logic)
                 addFloatingText('Combo! One more!', 'heal', 50, 50);
                 setBattlePhase(1); 
                 // setupRound triggered by useEffect on battlePhase change
                 // setIsProcessing(false) will be handled after setup
            } else {
                 // Second Question Done (battlePhase === 1) -> Victory
                 addFloatingText('Victory!', 'heal', 50, 50);
                 
                 // Remove monster from world
                 let allDefeated = false;
                 if (currentMonsterId !== null) {
                   const updatedMonsters = monsters.map(m => m.id === currentMonsterId ? { ...m, isDefeated: true } : m);
                   setMonsters(updatedMonsters);
                   allDefeated = updatedMonsters.every(m => m.isDefeated);
                 }

                 if (allDefeated) {
                   startCelebration();
                   setGameState(prev => ({
                     ...prev,
                     status: 'EXPLORING',
                     level: prev.level + 1,
                     playerHp: Math.min(prev.maxPlayerHp, prev.playerHp + 20)
                   }));
                 } else {
                    setGameState(prev => ({
                        ...prev,
                        status: 'EXPLORING',
                        level: prev.level + 1,
                        playerHp: Math.min(prev.maxPlayerHp, prev.playerHp + 20)
                    }));
                 }
                 setBattlePhase(0);
                 setIsProcessing(false);
                 setSelectedOptionId(null);
            }
        }, 800);
      }, 200);

    } else {
      // Incorrect Answer
      addFloatingText('MISS', 'miss', 30, 30);

      if (currentIdiom) {
        const exists = wrongRecords.some(r => r.idiom.id === currentIdiom.id && r.mode === gameMode);
        if (!exists) {
          setWrongRecords(prev => [...prev, { idiom: currentIdiom, mode: gameMode }]);
        }
      }
      
      setDisabledOptionIds(prev => [...prev, optionId]);

      setTimeout(() => {
        const damage = 15;
        setShakeScreen(true);
        setTimeout(() => setShakeScreen(false), 500);

        addFloatingText(damage.toString(), 'damage', 20, 60);

        setGameState(prev => {
          const newHp = Math.max(0, prev.playerHp - damage);
          return {
            ...prev,
            playerHp: newHp,
            streak: 0,
            status: newHp <= 0 ? 'DEFEAT' : 'BATTLE'
          };
        });

        // Allow retry
        setTimeout(() => {
           if (gameState.playerHp > 0) {
             setIsProcessing(false);
             setSelectedOptionId(null);
           }
        }, 500);
      }, 300);
    }
  };

  const renderExampleModal = () => (
    <div 
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" 
      onClick={() => setShowExampleModal(false)}
    >
      <div 
        className="bg-slate-800 w-full max-w-2xl rounded-2xl border-2 border-slate-600 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => setShowExampleModal(false)} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
        
        <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <FileJson className="text-yellow-400" />
          JSON Format Example
        </h3>
        <p className="text-slate-300 mb-4 text-sm">
          Create a <code>.json</code> file with an array of objects. Each object must have a <code>word</code> (or <code>idiom</code>) and a <code>definition</code>.
        </p>
        
        <div className="bg-slate-950 p-4 rounded-lg overflow-auto max-h-[50vh] border border-slate-700 shadow-inner relative group">
          <button 
            onClick={handleCopyExample}
            className={`absolute top-2 right-2 p-2 rounded-lg border transition-all ${
              isCopied 
                ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                : 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700 hover:text-white'
            }`}
            title="Copy to Clipboard"
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <pre className="text-emerald-400 font-mono text-sm leading-relaxed whitespace-pre-wrap selection:bg-emerald-900 select-text">
            {EXAMPLE_JSON_CONTENT}
          </pre>
        </div>
        
        <div className="mt-6 flex justify-end">
           <Button onClick={() => setShowExampleModal(false)} variant="secondary" size="sm">Close</Button>
        </div>
      </div>
    </div>
  );

  // --- Render Sections ---

  const renderMenu = () => (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white animate-in fade-in zoom-in duration-500 overflow-y-auto py-10">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg">
          IDIOM BLOX RPG
        </h1>
        <p className="text-slate-400 text-xl">Master the Idioms. Defeat the Beasts.</p>
      </div>

      {/* Data Source Selection */}
      <div className="w-full max-w-md bg-slate-800 rounded-xl p-1 flex mb-4 border border-slate-700">
         <button 
           onClick={() => setIsCustomMode(false)}
           className={`flex-1 py-2 rounded-lg font-bold transition-all ${!isCustomMode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700'}`}
         >
           Built-in Questions
         </button>
         <button 
           onClick={() => setIsCustomMode(true)}
           className={`flex-1 py-2 rounded-lg font-bold transition-all ${isCustomMode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700'}`}
         >
           Custom URL (JSON)
         </button>
      </div>

      {/* Custom URL Input */}
      {isCustomMode && (
        <div className="w-full max-w-md mb-6 animate-in slide-in-from-top-4">
           <div className="flex gap-2">
             <div className="flex-1 flex items-center gap-2 bg-slate-900 border-2 border-slate-600 rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
                <LinkIcon className="text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="https://example.com/idioms.json" 
                  className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-full"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
             </div>
             <button 
                onClick={() => setShowExampleModal(true)}
                className="bg-slate-700 hover:bg-slate-600 text-yellow-400 p-3 rounded-xl border-2 border-slate-600 transition-colors shadow-lg active:scale-95"
                title="View Example JSON"
             >
                <FileJson size={24} />
             </button>
           </div>
           <p className="text-xs text-slate-500 mt-2 px-2">
             Format: JSON Array [{"word": "...", "definition": "..."}, ...]
           </p>
        </div>
      )}

      {/* Error Message */}
      {menuError && (
        <div className="w-full max-w-md mb-6 bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 animate-in fade-in">
           <AlertCircle className="text-red-400 shrink-0 mt-0.5" />
           <p className="text-red-200 text-sm font-bold">{menuError}</p>
        </div>
      )}

      {/* Monster Count Selection */}
      <div className="mb-8 flex gap-4 bg-slate-800 p-2 rounded-xl border border-slate-700">
         {[5, 10, 15].map(count => (
            <button
               key={count}
               onClick={() => setSelectedMonsterCount(count as any)}
               className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  selectedMonsterCount === count 
                  ? 'bg-yellow-500 text-black shadow-lg scale-105' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
               }`}
            >
               {count} Beasts ({count * 2} Qs)
            </button>
         ))}
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl px-8">
        <button 
          onClick={() => startGame('DEF_TO_IDIOM')}
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white p-6 rounded-2xl border-b-8 border-blue-800 active:border-b-0 active:translate-y-2 transition-all flex flex-col items-center gap-3 shadow-xl group"
        >
          {isLoading ? <Loader2 className="w-12 h-12 animate-spin text-blue-200" /> : <BookOpen className="w-12 h-12 text-blue-200 group-hover:scale-110 transition-transform" />}
          <div className="text-2xl font-black">Mode 1</div>
          <div className="text-blue-200 font-bold">Def ➜ Idiom</div>
        </button>

        <button 
          onClick={() => startGame('IDIOM_TO_DEF')}
          disabled={isLoading}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 text-white p-6 rounded-2xl border-b-8 border-emerald-800 active:border-b-0 active:translate-y-2 transition-all flex flex-col items-center gap-3 shadow-xl group"
        >
          {isLoading ? <Loader2 className="w-12 h-12 animate-spin text-emerald-200" /> : <Library className="w-12 h-12 text-emerald-200 group-hover:scale-110 transition-transform" />}
          <div className="text-2xl font-black">Mode 2</div>
          <div className="text-emerald-200 font-bold">Idiom ➜ Def</div>
        </button>
      </div>

      <div className="mt-12 text-slate-500 text-sm">
        Use Virtual Controls on Screen
      </div>
    </div>
  );

  const renderGameOver = () => (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in zoom-in duration-300">
      <Skull className="w-24 h-24 text-red-500 mb-4" />
      <h2 className="text-5xl font-bold text-white mb-6">GAME OVER</h2>
      <div className="text-2xl text-yellow-400 mb-8">Score: {gameState.score}</div>
      <Button variant="primary" size="lg" onClick={() => setGameState(prev => ({...prev, status: 'MENU'}))}>
        <RefreshCw className="mr-2 inline-block" /> Main Menu
      </Button>
    </div>
  );

  const renderVictory = () => (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-yellow-500/20 backdrop-blur-md animate-in zoom-in duration-300">
      <Trophy className="w-24 h-24 text-yellow-400 mb-4 drop-shadow-lg" />
      <h2 className="text-6xl font-black text-white mb-6 drop-shadow-xl border-white">VICTORY!</h2>
      <p className="text-white/80 text-xl mb-6 font-bold">All Beasts Defeated!</p>
      <div className="text-3xl text-white mb-8 font-black bg-slate-900/50 px-6 py-2 rounded-full">Score: {gameState.score}</div>
      <Button variant="primary" size="lg" onClick={() => setGameState(prev => ({...prev, status: 'MENU'}))}>
        <RefreshCw className="mr-2 inline-block" /> Play Again
      </Button>
    </div>
  );

  const renderWrongListModal = () => {
    // Filter records based on active tab
    const currentRecords = wrongRecords.filter(r => r.mode === reviewTab);

    return (
      <div 
        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" 
        onClick={() => setShowWrongList(false)}
      >
        <div 
          className="bg-slate-800 w-full max-w-3xl max-h-[85vh] rounded-2xl border-2 border-slate-600 shadow-2xl flex flex-col animate-in zoom-in duration-200 overflow-hidden" 
          onClick={(e) => e.stopPropagation()}
        >
           {/* Header */}
           <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                 <BookOpen className="text-yellow-400" />
                 Review Mistakes
              </h2>
              <button 
                onClick={() => setShowWrongList(false)}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
           </div>

           {/* Tabs */}
           <div className="flex border-b border-slate-700 bg-slate-900/50">
              <button 
                onClick={() => setReviewTab('DEF_TO_IDIOM')}
                className={`flex-1 py-4 font-bold transition-colors ${reviewTab === 'DEF_TO_IDIOM' ? 'text-blue-400 border-b-4 border-blue-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
              >
                看解釋 ➜ 選成語 ({wrongRecords.filter(r => r.mode === 'DEF_TO_IDIOM').length})
              </button>
              <button 
                onClick={() => setReviewTab('IDIOM_TO_DEF')}
                className={`flex-1 py-4 font-bold transition-colors ${reviewTab === 'IDIOM_TO_DEF' ? 'text-emerald-400 border-b-4 border-emerald-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
              >
                看成語 ➜ 選解釋 ({wrongRecords.filter(r => r.mode === 'IDIOM_TO_DEF').length})
              </button>
           </div>

           {/* Content */}
           <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-800">
              <div className="flex justify-end mb-4">
                 {currentRecords.length > 0 && (
                   <button
                      onClick={clearWrongHistory}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 border border-red-500/30 transition-colors flex items-center gap-2"
                   >
                      <Trash2 size={18} />
                      <span className="font-bold">Clear This List</span>
                   </button>
                 )}
              </div>

              {currentRecords.length === 0 ? (
                 <div className="text-center text-slate-500 py-12 flex flex-col items-center">
                    <BookOpen size={48} className="mb-4 opacity-20" />
                    <p>No mistakes in this mode yet!</p>
                 </div>
              ) : (
                 currentRecords.map((record, idx) => (
                    <div key={idx} className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 flex flex-col gap-2">
                       {/* Display logic: Highlight the question part based on mode */}
                       <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                          <div className={`text-xl font-bold px-3 py-1 rounded bg-slate-900 w-full md:w-auto text-center ${record.mode === 'DEF_TO_IDIOM' ? 'text-yellow-400' : 'text-blue-300'}`}>
                             {record.idiom.word}
                          </div>
                          <div className={`flex-1 text-slate-300 text-sm md:text-base ${record.mode === 'IDIOM_TO_DEF' ? 'font-bold text-yellow-100' : ''}`}>
                             {record.idiom.definition}
                          </div>
                       </div>
                    </div>
                 ))
              )}
           </div>

           {/* Footer */}
           <div className="p-4 border-t border-slate-700 bg-slate-900">
              <Button className="w-full" onClick={() => setShowWrongList(false)}>Close Review</Button>
           </div>
        </div>
      </div>
    );
  };

  const renderBattleOverlay = () => {
    // Determine content based on Game Mode
    const questionText = gameMode === 'DEF_TO_IDIOM' 
       ? currentIdiom?.definition 
       : currentIdiom?.word;
    
    // Style adjustments for mode
    const isDefMode = gameMode === 'IDIOM_TO_DEF'; // Buttons contain definitions (long text)

    return (
    <div className="absolute inset-0 z-40 flex flex-col pointer-events-none">
      <div className="absolute inset-0 bg-slate-900/30" />
      
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto pointer-events-auto p-4 flex flex-col items-center animate-in slide-in-from-bottom-10 duration-300">
        <FloatingTextDisplay items={floatingTexts} />
        
        {/* Battle HUD */}
        <div className="w-full max-w-4xl flex justify-between items-center bg-slate-800/80 p-2 md:p-4 rounded-xl border border-slate-600 mb-4 shadow-xl shrink-0">
           <HealthBar current={gameState.playerHp} max={gameState.maxPlayerHp} label="You" color="bg-green-500" isPlayer />
           
           <div className="flex flex-col items-center gap-2 px-2">
             <div className="text-xl md:text-3xl font-black text-yellow-500">VS</div>
             <button 
                onClick={handleRunAway}
                className="bg-red-500 hover:bg-red-400 text-white text-xs md:text-sm px-3 py-1 rounded-lg border-b-4 border-red-700 active:border-b-0 active:scale-95 transition-all flex items-center gap-1 font-bold"
             >
                <LogOut size={14} /> Escape
             </button>
             {/* Phase Indicator */}
             <div className="flex gap-1">
                <div className={`w-2 h-2 rounded-full ${battlePhase >= 0 ? 'bg-yellow-400' : 'bg-slate-600'}`}></div>
                <div className={`w-2 h-2 rounded-full ${battlePhase >= 1 ? 'bg-yellow-400' : 'bg-slate-600'}`}></div>
             </div>
           </div>

           <HealthBar current={gameState.enemyHp} max={gameState.maxEnemyHp} label="Beast" color="bg-red-500" />
        </div>

        {/* Quiz Panel */}
        <div className="w-full max-w-4xl bg-slate-800 p-4 md:p-6 rounded-2xl shadow-2xl border-2 border-slate-600 flex flex-col gap-4 flex-1 min-h-0">
           {/* Question Area - Shrinkable but content scrolls if needed */}
           <div className="text-center shrink-0">
              <h3 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-2 shadow-black drop-shadow-sm">
                 {isDefMode ? "Select the correct definition:" : "Identify the matching idiom:"}
              </h3>
              <div className="bg-slate-900 p-4 md:p-6 rounded-xl border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] max-h-[30vh] overflow-y-auto">
                <p className={`font-black text-white leading-relaxed tracking-wide drop-shadow-md ${isDefMode ? 'text-3xl md:text-5xl' : 'text-2xl md:text-3xl'}`}>
                   {questionText}
                </p>
              </div>
           </div>

           {/* Options Grid - Scrollable if content overflows */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 overflow-y-auto pb-2">
              {options.map((opt) => {
                 let btnVariant: 'primary' | 'success' | 'danger' | 'secondary' = 'secondary';
                 const isDisabled = disabledOptionIds.includes(opt.id);
                 
                 if (selectedOptionId) {
                    if (opt.id === currentIdiom?.id && selectedOptionId === opt.id) btnVariant = 'success';
                    else if (opt.id === selectedOptionId) btnVariant = 'danger';
                    else btnVariant = 'secondary';
                 }
                 
                 let opacityClass = isDisabled ? "opacity-50 cursor-not-allowed" : "";
                 
                 // Button Text Content
                 const btnText = isDefMode ? opt.definition : opt.word;
                 // Font Size Adjustment for long text
                 const textSizeClass = isDefMode ? 'text-sm md:text-base leading-tight' : 'text-xl md:text-2xl';

                 return (
                    <Button
                       key={opt.id}
                       variant={btnVariant}
                       onClick={() => handleAttack(opt.id)}
                       disabled={!!selectedOptionId || isDisabled}
                       className={`py-3 md:py-4 min-h-[60px] md:min-h-[80px] flex items-center justify-center whitespace-normal ${textSizeClass} ${opacityClass}`}
                    >
                       {btnText}
                    </Button>
                 );
              })}
           </div>
        </div>
      </div>
    </div>
  )};

  const renderHUD = () => (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-auto z-30">
        <div className="flex items-center gap-4">
            <div className="bg-slate-900/50 backdrop-blur p-2 rounded-lg border border-slate-700 flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-500 rounded border-2 border-white overflow-hidden flex items-center justify-center">
                    <span className="text-xl">😎</span>
                </div>
                <div className="w-32 hidden md:block">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${(gameState.playerHp / gameState.maxPlayerHp) * 100}%` }}></div>
                    </div>
                </div>
            </div>
            {/* Mode Indicator */}
            <div className="hidden md:flex bg-slate-900/50 backdrop-blur px-3 py-1 rounded-lg border border-slate-700 text-xs text-slate-300 font-bold uppercase tracking-wider">
               {gameMode === 'DEF_TO_IDIOM' ? 'Mode: Explanation' : 'Mode: Idiom'}
            </div>
            {/* Quest Indicator */}
            <div className="hidden md:flex bg-slate-900/50 backdrop-blur px-3 py-1 rounded-lg border border-slate-700 text-xs text-yellow-400 font-bold uppercase tracking-wider">
               Beasts: {monsters.filter(m => !m.isDefeated).length}
            </div>
        </div>
        
        {isCelebration && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center animate-bounce">
            <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-red-500 drop-shadow-lg" style={{textShadow: '0 0 20px rgba(255,165,0,0.5)'}}>
              CLEARED!
            </h2>
          </div>
        )}

        <div className="flex gap-4">
            <div className="bg-slate-900/50 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2 text-yellow-400 font-bold">
                <Trophy size={16} /> {gameState.score}
            </div>
            
            <button 
               onClick={() => setShowWrongList(true)}
               className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2 text-white font-bold transition-all active:scale-95"
            >
               <BookOpen size={20} />
               <span className="hidden md:inline">Review</span>
            </button>
        </div>
    </div>
  );

  return (
    <div className={`relative h-screen w-full bg-sky-300 overflow-hidden ${shakeScreen ? 'shake' : ''}`}>
      
      {/* 3D World */}
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
        {gameState.status !== 'MENU' && (
             <World 
               monsters={monsters} 
               onEncounter={handleEncounter}
               playerPosition={playerPosition}
               setPlayerPosition={setPlayerPosition}
               isBattling={gameState.status === 'BATTLE'}
               isCelebration={isCelebration}
             />
        )}
      </Canvas>

      {/* UI Layers */}
      {gameState.status === 'MENU' && renderMenu()}
      {showExampleModal && renderExampleModal()}
      {gameState.status !== 'MENU' && renderHUD()}
      {gameState.status === 'EXPLORING' && <MobileControls />}
      {gameState.status === 'BATTLE' && renderBattleOverlay()}
      {gameState.status === 'DEFEAT' && renderGameOver()}
      {gameState.status === 'VICTORY' && renderVictory()}
      {showWrongList && renderWrongListModal()}
      
    </div>
  );
}