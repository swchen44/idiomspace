import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Text, useFont } from '@react-three/drei';
// Fix: Import THREE as a namespace to satisfy both value and type requirements
import * as THREE from 'three';
import { ALL_IDIOMS } from './data/idioms';
import { Idiom, GameState, FloatingText, WorldMonster, GameMode, WrongRecord, WorldProp } from './types';
import { Button } from './components/Button';
import { HealthBar } from './components/HealthBar';
import { FloatingTextDisplay } from './components/FloatingTextDisplay';
import { Sword, Trophy, Zap, RefreshCw, Skull, Map as MapIcon, Compass, BookOpen, X, List, ArrowLeftRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2, Library, LogOut, Users, Swords, Link as LinkIcon, AlertCircle, Loader2, FileJson, Copy, Check, Sparkles, Gamepad2, History } from 'lucide-react';

// -----------------------------------------------------------------------------
// Constants & Configuration
// -----------------------------------------------------------------------------

const WORLD_SIZE = 400;
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
    "definition": "形容人因為馬虎或健忘,不是忘了這個,就是後來忘了那個。",
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

const Firework: React.FC<{ position: [number, number, number], color: string, onComplete: () => void }> = ({ position, color, onComplete }) => {
  const particles = useMemo(() => {
    return new Array(50).fill(0).map(() => ({
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ),
      offset: new THREE.Vector3(0, 0, 0)
    }));
  }, []);

  const groupRef = useRef<THREE.Group>(null);
  const [elapsed, setElapsed] = useState(0);

  useFrame((state, delta) => {
    setElapsed(prev => prev + delta);
    if (elapsed > 1.5) {
      onComplete();
      return;
    }
    
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const p = particles[i];
        p.offset.add(p.velocity.clone().multiplyScalar(delta));
        p.velocity.y -= 9.8 * delta * 0.5; 
        child.position.set(p.offset.x, p.offset.y, p.offset.z);
        
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, 1 - elapsed / 1.5);
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
    if (Math.random() < 0.08) { 
      const id = nextId.current++;
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      const y = 2 + Math.random() * 10; 
      
      const rainbowColors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
      const color = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];

      setFireworks(prev => [...prev, { id, position: [x, y, z], color }]);
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
          position={fw.position} 
          color={fw.color} 
          onComplete={() => removeFirework(fw.id)} 
        />
      ))}
    </>
  );
};

const Tree: React.FC<{ prop: WorldProp }> = ({ prop }) => {
  return (
    <group position={[prop.x, 0, prop.z]} scale={[prop.scale, prop.scale, prop.scale]}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.6, 3, 7]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[2.2]} />
        <meshStandardMaterial color="#15803d" />
      </mesh>
      <mesh position={[0, 5.5, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1.5]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  );
};

const PlayerModel: React.FC<{ 
  position: [number, number, number]; 
  rotation: number;
  isMoving: boolean;
}> = ({ position, rotation, isMoving }) => {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (isMoving) {
      const t = state.clock.getElapsedTime();
      if (legL.current && legR.current && armL.current && armR.current) {
        legL.current.rotation.x = Math.sin(t * 10) * 0.5;
        legR.current.rotation.x = Math.sin(t * 10 + Math.PI) * 0.5;
        armL.current.rotation.x = Math.sin(t * 10 + Math.PI) * 0.5;
        armR.current.rotation.x = Math.sin(t * 10) * 0.5;
      }
    } else {
       if (legL.current && legR.current && armL.current && armR.current) {
        legL.current.rotation.x = 0;
        legR.current.rotation.x = 0;
        armL.current.rotation.x = 0;
        armR.current.rotation.x = 0;
       }
    }
  });

  return (
    <group ref={group} position={position} rotation={[0, rotation, 0]} castShadow>
      <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial color="#fbbf24" /> 
      </mesh>
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 1]} />
        <meshStandardMaterial color="#3b82f6" /> 
      </mesh>
      <mesh ref={armL} position={[-1.5, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 2, 0.8]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh ref={armR} position={[1.5, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 2, 0.8]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh ref={legL} position={[-0.5, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 2, 0.9]} />
        <meshStandardMaterial color="#22c55e" /> 
      </mesh>
      <mesh ref={legR} position={[0.5, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 2, 0.9]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  );
};

const Monster3D: React.FC<{ 
  monster: WorldMonster;
  isSelected: boolean; 
}> = ({ monster, isSelected }) => {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (group.current) {
      group.current.position.y = monster.bodyType === 'biped' 
        ? Math.sin(state.clock.getElapsedTime() * 2 + monster.id) * 0.1
        : Math.sin(state.clock.getElapsedTime() * 2 + monster.id) * 0.1 - 0.5; 
    }
  });

  return (
    <group ref={group} position={[monster.x, 1.5, monster.z]}>
      {monster.bodyType === 'biped' ? (
        <group>
          <mesh position={[0, 4, 0]} castShadow receiveShadow>
             <boxGeometry args={[1.5, 1.5, 1.5]} />
             <meshStandardMaterial color={monster.color} />
          </mesh>
           <mesh position={[-0.3, 4, 0.76]}>
             <planeGeometry args={[0.2, 0.2]} />
             <meshBasicMaterial color="black" />
           </mesh>
           <mesh position={[0.3, 4, 0.76]}>
             <planeGeometry args={[0.2, 0.2]} />
             <meshBasicMaterial color="black" />
           </mesh>
          <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
             <boxGeometry args={[1.8, 1.5, 1]} />
             <meshStandardMaterial color={monster.color} />
          </mesh>
          <mesh position={[-0.5, 1, 0]} castShadow receiveShadow>
             <boxGeometry args={[0.6, 1.5, 0.6]} />
             <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.5, 1, 0]} castShadow receiveShadow>
             <boxGeometry args={[0.6, 1.5, 0.6]} />
             <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[-0.5, 0.1, 0.3]} castShadow receiveShadow>
             <boxGeometry args={[0.7, 0.4, 0.9]} />
             <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.5, 0.1, 0.3]} castShadow receiveShadow>
             <boxGeometry args={[0.7, 0.4, 0.9]} />
             <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      ) : (
        <group scale={[0.8, 0.8, 0.8]} position={[0, 0.5, 0]}> 
           <mesh position={[0, 2, 0]} castShadow receiveShadow>
             <boxGeometry args={[1.5, 1.2, 3]} />
             <meshStandardMaterial color={monster.color} />
           </mesh>
           <mesh position={[0, 3, 1.5]} castShadow receiveShadow>
             <boxGeometry args={[1.2, 1.2, 1.2]} />
             <meshStandardMaterial color={monster.color} />
           </mesh>
           <mesh position={[-0.6, 0.6, 1.2]} castShadow receiveShadow>
             <boxGeometry args={[0.4, 1.2, 0.4]} />
             <meshStandardMaterial color="#1e293b" />
           </mesh>
           <mesh position={[-0.6, 0, 1.2]} castShadow receiveShadow>
             <boxGeometry args={[0.5, 0.3, 0.5]} />
             <meshStandardMaterial color="#0f172a" />
           </mesh>
           <mesh position={[0.6, 0.6, 1.2]} castShadow receiveShadow>
             <boxGeometry args={[0.4, 1.2, 0.4]} />
             <meshStandardMaterial color="#1e293b" />
           </mesh>
           <mesh position={[0.6, 0, 1.2]} castShadow receiveShadow>
             <boxGeometry args={[0.5, 0.3, 0.5]} />
             <meshStandardMaterial color="#0f172a" />
           </mesh>
           <mesh position={[-0.6, 0.6, -1.2]} castShadow receiveShadow>
             <boxGeometry args={[0.4, 1.2, 0.4]} />
             <meshStandardMaterial color="#1e293b" />
           </mesh>
           <mesh position={[-0.6, 0, -1.2]} castShadow receiveShadow>
             <boxGeometry args={[0.5, 0.3, 0.5]} />
             <meshStandardMaterial color="#0f172a" />
           </mesh>
           <mesh position={[0.6, 0.6, -1.2]} castShadow receiveShadow>
             <boxGeometry args={[0.4, 1.2, 0.4]} />
             <meshStandardMaterial color="#1e293b" />
           </mesh>
           <mesh position={[0.6, 0, -1.2]} castShadow receiveShadow>
             <boxGeometry args={[0.5, 0.3, 0.5]} />
             <meshStandardMaterial color="#0f172a" />
           </mesh>
        </group>
      )}
      <mesh position={[0, 6, 0]}>
        <planeGeometry args={[3, 0.5]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </group>
  );
};

const World: React.FC<{ 
  playerPos: {x: number, z: number, rotation: number}; 
  monsters: WorldMonster[];
  props: WorldProp[];
  onPlayerMove: (newPos: {x: number, z: number}, rotation: number) => void;
  isBattling: boolean;
  isCelebration: boolean;
}> = ({ playerPos, monsters, props, onPlayerMove, isBattling, isCelebration }) => {
  const { camera } = useThree();
  const [controls, setControls] = useState({ up: false, down: false, left: false, right: false, rotateLeft: false, rotateRight: false, rotateUp: false, rotateDown: false });
  
  const orbitAngle = useRef({ h: 0, v: 1.1 }); 
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const sunPosition: [number, number, number] = [50, 150, 50]; 

  useEffect(() => {
    if (isBattling) {
      setControls({
        up: false, down: false, left: false, right: false,
        rotateLeft: false, rotateRight: false, rotateUp: false, rotateDown: false
      });
    }
  }, [isBattling]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBattling) return; 
      switch(e.key) {
        case 'w': case 'W': setControls(c => ({ ...c, up: true })); break;
        case 's': case 'S': setControls(c => ({ ...c, down: true })); break;
        case 'a': case 'A': setControls(c => ({ ...c, left: true })); break;
        case 'd': case 'D': setControls(c => ({ ...c, right: true })); break;
        case 'ArrowLeft': setControls(c => ({ ...c, rotateLeft: true })); break;
        case 'ArrowRight': setControls(c => ({ ...c, rotateRight: true })); break;
        case 'ArrowUp': setControls(c => ({ ...c, rotateUp: true })); break;
        case 'ArrowDown': setControls(c => ({ ...c, rotateDown: true })); break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'w': case 'W': setControls(c => ({ ...c, up: false })); break;
        case 's': case 'S': setControls(c => ({ ...c, down: false })); break;
        case 'a': case 'A': setControls(c => ({ ...c, left: false })); break;
        case 'd': case 'D': setControls(c => ({ ...c, right: false })); break;
        case 'ArrowLeft': setControls(c => ({ ...c, rotateLeft: false })); break;
        case 'ArrowRight': setControls(c => ({ ...c, rotateRight: false })); break;
        case 'ArrowUp': setControls(c => ({ ...c, rotateUp: false })); break;
        case 'ArrowDown': setControls(c => ({ ...c, rotateDown: false })); break;
      }
    };
    
    (window as any).setVirtualControl = (key: string, value: boolean) => {
      setControls(c => ({ ...c, [key]: value }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      delete (window as any).setVirtualControl;
    };
  }, [isBattling]);

  useFrame((state, delta) => {
    if (controls.rotateLeft) orbitAngle.current.h += ROTATION_SPEED * delta;
    if (controls.rotateRight) orbitAngle.current.h -= ROTATION_SPEED * delta;
    if (controls.rotateUp) orbitAngle.current.v = Math.max(0.1, orbitAngle.current.v - ROTATION_SPEED * delta * 0.5);
    if (controls.rotateDown) orbitAngle.current.v = Math.min(Math.PI / 2.1, orbitAngle.current.v + ROTATION_SPEED * delta * 0.5);

    const cameraDist = 30; 
    const cameraOffset = new THREE.Vector3(
      Math.sin(orbitAngle.current.h) * cameraDist * Math.cos(orbitAngle.current.v),
      cameraDist * Math.sin(orbitAngle.current.v),
      Math.cos(orbitAngle.current.h) * cameraDist * Math.cos(orbitAngle.current.v)
    );
    
    const targetCamPos = new THREE.Vector3(playerPos.x, 0, playerPos.z).add(cameraOffset);
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(playerPos.x, 2, playerPos.z);

    if (!isBattling) {
      const moveVec = new THREE.Vector3(0, 0, 0);
      const forward = new THREE.Vector3(Math.sin(orbitAngle.current.h), 0, Math.cos(orbitAngle.current.h)).normalize().negate();
      const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();

      if (controls.up) moveVec.add(forward);
      if (controls.down) moveVec.sub(forward);
      if (controls.right) moveVec.add(right);
      if (controls.left) moveVec.sub(right);

      if (moveVec.length() > 0) {
        moveVec.normalize().multiplyScalar(MOVEMENT_SPEED * delta);
        const newX = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, playerPos.x + moveVec.x));
        const newZ = Math.max(-WORLD_SIZE/2, Math.min(WORLD_SIZE/2, playerPos.z + moveVec.z));
        
        const targetRotation = Math.atan2(moveVec.x, moveVec.z);
        let rotDiff = targetRotation - playerPos.rotation;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        const newRotation = playerPos.rotation + rotDiff * 10 * delta;

        onPlayerMove({x: newX, z: newZ}, newRotation);
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight 
        ref={sunRef}
        position={sunPosition} 
        intensity={1.5} 
        castShadow
        shadow-mapSize={[4096, 4096]} 
        shadow-bias={-0.0005}
      >
        <orthographicCamera attach="shadow-camera" args={[-300, 300, 300, -300]} />
      </directionalLight>

      <Sky sunPosition={sunPosition} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>

      <gridHelper args={[WORLD_SIZE, 40, "#15803d", "#15803d"]} position={[0, 0.1, 0]} />

      <PlayerModel position={[playerPos.x, 0, playerPos.z]} rotation={playerPos.rotation} isMoving={!isBattling && (controls.up || controls.down || controls.left || controls.right)} />
      
      {props.map(prop => (
        <Tree key={prop.id} prop={prop} />
      ))}

      {monsters.map(monster => !monster.isDefeated && (
        <Monster3D key={monster.id} monster={monster} isSelected={false} />
      ))}

      {isCelebration && <FireworksDisplay />}
    </>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    playerHp: PLAYER_MAX_HP,
    maxPlayerHp: PLAYER_MAX_HP,
    enemyHp: MONSTER_HP,
    maxEnemyHp: MONSTER_HP,
    score: 0,
    streak: 0,
    level: 1,
    status: 'MENU',
  });

  const [activeDataset, setActiveDataset] = useState<Idiom[]>(ALL_IDIOMS);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const [recentUrls, setRecentUrls] = useState<string[]>(() => {
    const saved = localStorage.getItem('idiomQuest_recentUrls');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);

  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0, rotation: 0 });
  const [worldMonsters, setWorldMonsters] = useState<WorldMonster[]>([]);
  const [worldProps, setWorldProps] = useState<WorldProp[]>([]);
  const [currentMonsterId, setCurrentMonsterId] = useState<number | null>(null);
  const [gameQueue, setGameQueue] = useState<Idiom[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [wrongIdioms, setWrongIdioms] = useState<WrongRecord[]>(() => {
    const saved = localStorage.getItem('idiomQuest_wrongRecords');
    return saved ? JSON.parse(saved) : [];
  });
  const [showReview, setShowReview] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('DEF_TO_IDIOM');
  const [selectedMonsterCount, setSelectedMonsterCount] = useState<number>(10);
  const [isCelebration, setIsCelebration] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const [currentOptions, setCurrentOptions] = useState<Idiom[]>([]);
  const [selectedWrongIds, setSelectedWrongIds] = useState<string[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('idiomQuest_wrongRecords', JSON.stringify(wrongIdioms));
  }, [wrongIdioms]);

  const addToRecentUrls = (url: string) => {
    setRecentUrls(prev => {
      const newUrls = [url, ...prev.filter(u => u !== url)].slice(0, 10);
      localStorage.setItem('idiomQuest_recentUrls', JSON.stringify(newUrls));
      return newUrls;
    });
  };

  const playExplosionSound = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(100, t);
    osc1.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
    gain1.gain.setValueAtTime(0.5, t);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.5);

    const bufferSize = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.1, t);
    gain2.gain.exponentialRampToValueAtTime(0.01, t + 1.0);
    noise.connect(gain2);
    gain2.connect(ctx.destination);
    noise.start(t);
  };

  const fetchAndValidateCustomData = async (url: string): Promise<Idiom[]> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('JSON format error: Root must be an array of objects.');
      }

      const parsed: Idiom[] = (data as any[]).map((item: any, index: number) => {
        const word = item.word || item.idiom;
        const definition = item.definition || item.meaning;
        const example = item.example;

        if (!word || !definition) {
           throw new Error(`Item at index ${index} is missing "word" or "definition"`);
        }
        
        return {
          id: `custom-${index}`,
          word: String(word).trim(),
          definition: String(definition).trim(),
          example: example ? String(example).trim() : undefined
        };
      });

      if (parsed.length === 0) {
        throw new Error(`Dataset is empty.`);
      }
      return parsed;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to load JSON data');
    }
  };

  const initWorld = useCallback((count: number) => {
    const newMonsters: WorldMonster[] = [];
    for (let i = 0; i < count; i++) {
      newMonsters.push({
        id: i,
        x: (Math.random() - 0.5) * (WORLD_SIZE * 0.8),
        z: (Math.random() - 0.5) * (WORLD_SIZE * 0.8),
        level: 1,
        isDefeated: false,
        color: MONSTER_COLORS[i % MONSTER_COLORS.length],
        bodyType: Math.random() > 0.5 ? 'biped' : 'quadruped',
      });
    }
    setWorldMonsters(newMonsters);

    const newProps: WorldProp[] = [];
    for (let i = 0; i < 50; i++) {
        let x = (Math.random() - 0.5) * (WORLD_SIZE * 0.9);
        let z = (Math.random() - 0.5) * (WORLD_SIZE * 0.9);
        if (Math.abs(x) < 20 && Math.abs(z) < 20) {
            x += 30;
            z += 30;
        }
        newProps.push({
            id: i,
            type: 'tree',
            x,
            z,
            scale: 0.8 + Math.random() * 0.5
        });
    }
    setWorldProps(newProps);

    setPlayerPos({ x: 0, z: 0, rotation: 0 });
  }, []);

  const startGame = async (mode: GameMode) => {
    setMenuError(null);
    setIsLoading(true);

    let dataset = ALL_IDIOMS;
    
    if (isCustomMode && customUrl) {
      try {
        dataset = await fetchAndValidateCustomData(customUrl);
        setActiveDataset(dataset);
        addToRecentUrls(customUrl); 
      } catch (err: any) {
        setMenuError(err.message);
        setIsLoading(false);
        return;
      }
    } else {
      setActiveDataset(ALL_IDIOMS);
    }

    const effectiveMonsterCount = Math.min(selectedMonsterCount, dataset.length);
    const totalQuestions = effectiveMonsterCount;
    
    let selectedQuestions: Idiom[] = [];

    if (isCustomMode) {
      selectedQuestions = [...dataset].sort(() => 0.5 - Math.random()).slice(0, totalQuestions);
    } else {
      const modeWrongRecords = wrongIdioms
        .filter(r => r.mode === mode)
        .map(r => r.idiom);

      const uniqueWrong = Array.from(new Map(modeWrongRecords.map(item => [item.word, item])).values());
      
      selectedQuestions = [...uniqueWrong];
      if (selectedQuestions.length > totalQuestions) {
        selectedQuestions = selectedQuestions.sort(() => 0.5 - Math.random()).slice(0, totalQuestions);
      }
      
      if (selectedQuestions.length < totalQuestions) {
        const needed = totalQuestions - selectedQuestions.length;
        const wrongWords = new Set(selectedQuestions.map(i => i.word));
        const pool = dataset.filter(i => !wrongWords.has(i.word));
        
        const randomFill = pool.sort(() => 0.5 - Math.random()).slice(0, needed);
        selectedQuestions = [...selectedQuestions, ...randomFill];
        
        if (selectedQuestions.length < totalQuestions) {
          const remaining = totalQuestions - selectedQuestions.length;
          const extra = dataset.sort(() => 0.5 - Math.random()).slice(0, remaining);
          selectedQuestions = [...selectedQuestions, ...extra];
        }
      }
      selectedQuestions = selectedQuestions.sort(() => 0.5 - Math.random());
    }

    setGameQueue(selectedQuestions);
    setGameMode(mode);
    initWorld(effectiveMonsterCount);
    setGameState({
      playerHp: PLAYER_MAX_HP,
      maxPlayerHp: PLAYER_MAX_HP,
      enemyHp: MONSTER_HP,
      maxEnemyHp: MONSTER_HP,
      score: 0,
      streak: 0,
      level: 1,
      status: 'EXPLORING',
    });
    setIsCelebration(false);
    setIsLoading(false);
  };

  const startCelebration = () => {
    setIsCelebration(true);
    playExplosionSound();
    const interval = setInterval(() => {
        playExplosionSound();
    }, 800);

    setTimeout(() => {
      clearInterval(interval);
      setIsCelebration(false);
      setGameState(prev => ({ ...prev, status: 'VICTORY' }));
    }, 15000); 
  };

  const handlePlayerMove = (newPos: {x: number, z: number}, rotation: number) => {
    setPlayerPos({ ...newPos, rotation });
    
    const collidedMonster = worldMonsters.find(m => 
      !m.isDefeated && 
      Math.hypot(m.x - newPos.x, m.z - newPos.z) < INTERACTION_DISTANCE
    );

    if (collidedMonster) {
      setCurrentMonsterId(collidedMonster.id);
      
      const questionIndex = collidedMonster.id;
      const currentQuestion = gameQueue[questionIndex];
      
      if (currentQuestion) {
          const otherIdioms = activeDataset.filter(i => i.id !== currentQuestion.id);
          const safeDistractorsCount = Math.min(3, otherIdioms.length);
          const distractors = otherIdioms.sort(() => 0.5 - Math.random()).slice(0, safeDistractorsCount);
          const options = [...distractors, currentQuestion].sort(() => 0.5 - Math.random());
          
          setCurrentOptions(options);
          setSelectedWrongIds([]);
          
          setGameState(prev => ({ ...prev, status: 'BATTLE', enemyHp: MONSTER_HP }));
      }
    }
  };

  const triggerFloatingText = (text: string, type: 'damage' | 'heal' | 'miss') => {
    const id = Date.now();
    const x = 50 + (Math.random() - 0.5) * 20;
    const y = 40;
    setFloatingTexts(prev => [...prev, { id, text, type, x, y }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(item => item.id !== id));
    }, 1000);
  };

  const handleRunAway = () => {
    setGameState(prev => ({ ...prev, status: 'EXPLORING' }));
    const pushBackDist = 5;
    setPlayerPos(prev => ({
      ...prev,
      x: prev.x - Math.sin(prev.rotation) * pushBackDist,
      z: prev.z - Math.cos(prev.rotation) * pushBackDist
    }));
  };

  const handleAttack = (option: Idiom) => {
    if (!currentMonsterId && currentMonsterId !== 0) return;
    if (selectedWrongIds.includes(option.id)) return;
    
    const questionIndex = currentMonsterId!;
    const currentQuestion = gameQueue[questionIndex];
    if (!currentQuestion) return;

    const isCorrect = option.id === currentQuestion.id;

    if (isCorrect) {
      const damage = 1000; 
      triggerFloatingText(damage.toString(), 'damage');
      
      setGameState(prev => ({
        ...prev,
        score: prev.score + (100 * (prev.streak + 1)),
        streak: prev.streak + 1,
        playerHp: Math.min(prev.maxPlayerHp, prev.playerHp + 5),
        enemyHp: 0, 
      }));
      triggerFloatingText("+5 HP", "heal");
      setShowFeedback(true);

    } else {
      triggerFloatingText("Miss", "miss");
      setSelectedWrongIds(prev => [...prev, option.id]); 

      setGameState(prev => ({
        ...prev,
        streak: 0,
        playerHp: Math.max(0, prev.playerHp - 15),
      }));

      if (!wrongIdioms.find(r => r.idiom.id === currentQuestion.id && r.mode === gameMode)) {
        setWrongIdioms(prev => [...prev, { idiom: currentQuestion, mode: gameMode }]);
      }

      if (gameState.playerHp - 15 <= 0) {
        setGameState(prev => ({ ...prev, status: 'DEFEAT' }));
      }
    }
  };

  const handleFeedbackNext = () => {
    setShowFeedback(false);
    setWorldMonsters(prev => prev.map(m => 
      m.id === currentMonsterId ? { ...m, isDefeated: true } : m
    ));

    const remaining = worldMonsters.filter(m => !m.isDefeated && m.id !== currentMonsterId).length;
    if (remaining === 0) {
      setGameState(prev => ({ ...prev, status: 'EXPLORING' })); 
      startCelebration();
    } else {
      setGameState(prev => ({ ...prev, status: 'EXPLORING' }));
    }
  };

  const copyExampleToClipboard = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(EXAMPLE_JSON_CONTENT).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  const renderExampleModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowExampleModal(false)}>
      <div className="bg-slate-800 border-2 border-slate-600 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <FileJson className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white">JSON Format Example</h3>
          </div>
          <button onClick={() => setShowExampleModal(false)} className="p-1 hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-[#1e1e1e] relative group">
           <button 
             onClick={copyExampleToClipboard}
             className="absolute top-4 right-4 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors border border-slate-600"
           >
             {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
             {isCopied ? "Copied!" : "Copy"}
           </button>
           <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap select-text selection:bg-blue-500/30">
             {EXAMPLE_JSON_CONTENT}
           </pre>
        </div>

        <div className="p-4 bg-slate-900/50 text-slate-400 text-sm border-t border-slate-700">
           <p>• The root must be an Array <code>[]</code></p>
           <p>• Each object must have <code>word</code> (or <code>idiom</code>) and <code>definition</code> (or <code>meaning</code>).</p>
           <p>• <code>example</code> is optional but recommended.</p>
        </div>
      </div>
    </div>
  );

  const renderMenu = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-50 p-4">
      <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 mb-2 drop-shadow-sm tracking-tighter text-center">
        IDIOM QUEST 3D
      </div>
      <div className="text-slate-400 mb-8 text-xl font-light tracking-widest text-center">CHINESE IDIOM RPG</div>

      <div className="bg-slate-800/80 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full backdrop-blur-md">
        
        <div className="flex bg-slate-900 rounded-lg p-1 mb-6">
          <button 
            onClick={() => setIsCustomMode(false)}
            className={`flex-1 py-2 rounded-md font-bold transition-all ${!isCustomMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Built-in Data
          </button>
          <button 
             onClick={() => setIsCustomMode(true)}
             className={`flex-1 py-2 rounded-md font-bold transition-all ${isCustomMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Custom URL
          </button>
        </div>

        {isCustomMode && (
          <div className="mb-6 space-y-2 relative">
            <label className="block text-sm text-slate-400 font-bold mb-1 ml-1">JSON Data URL</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/idioms.json"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <button 
                onClick={() => setShowExampleModal(true)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 rounded-lg border border-slate-600 flex items-center justify-center"
                title="View JSON Example"
              >
                <FileJson className="w-5 h-5" />
              </button>
              {recentUrls.length > 0 && (
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 rounded-lg border border-slate-600 flex items-center justify-center"
                  title="Recent URLs"
                >
                  <History className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {showHistory && recentUrls.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                   {recentUrls.map((url, idx) => (
                      <button 
                        key={idx}
                        className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700 last:border-0 transition-colors truncate font-mono"
                        onClick={() => {
                           setCustomUrl(url);
                           setShowHistory(false);
                        }}
                      >
                        {url}
                      </button>
                   ))}
                </div>
            )}
            
            <p className="text-xs text-slate-500 mt-1">Must contain 'word', 'definition', and 'example' fields.</p>
          </div>
        )}

        {menuError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200 text-sm animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {menuError}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm text-slate-400 font-bold mb-2 ml-1 text-center">Number of Monsters</label>
          <div className="flex gap-3 justify-center">
            {[5, 10, 15].map(count => (
              <button
                key={count}
                onClick={() => setSelectedMonsterCount(count)}
                className={`w-12 h-12 rounded-full font-bold border-2 transition-all ${
                  selectedMonsterCount === count 
                    ? 'bg-yellow-500 border-yellow-300 text-black scale-110 shadow-[0_0_15px_rgba(234,179,8,0.5)]' 
                    : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-3">
          <Button 
            className="w-full flex items-center justify-center gap-2 group relative overflow-hidden" 
            size="lg" 
            onClick={() => startGame('DEF_TO_IDIOM')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
            <span>Mode 1: Definition → Idiom</span>
          </Button>

          <Button 
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 border-indigo-800 text-white" 
            size="lg" 
            onClick={() => startGame('IDIOM_TO_DEF')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowLeftRight className="w-5 h-5" />}
            <span>Mode 2: Idiom → Definition</span>
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between text-sm text-slate-500">
           <span>v2.5.0</span>
           <div className="flex gap-4">
             <span>Exploration</span>
             <span>•</span>
             <span>Battle</span>
           </div>
        </div>
      </div>
    </div>
  );

  const renderFeedbackOverlay = () => {
    const questionIndex = currentMonsterId!;
    const currentQuestion = gameQueue[questionIndex];
    if (!currentQuestion) return null;

    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="bg-slate-800 border-2 border-green-500/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="bg-green-600 p-4 flex items-center justify-center gap-2 shadow-lg">
             <Check className="w-8 h-8 text-white stroke-[3px]" />
             <h2 className="text-2xl font-black text-white tracking-wider">CORRECT!</h2>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div className="space-y-2 text-center">
              <h3 className="text-4xl font-black text-yellow-400 drop-shadow-md">{currentQuestion.word}</h3>
              <p className="text-slate-300 text-lg">{currentQuestion.definition}</p>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/50 relative">
               <div className="absolute -top-3 left-4 bg-blue-600 text-xs font-bold px-2 py-1 rounded text-white shadow-sm uppercase tracking-wider flex items-center gap-1">
                 <Sparkles className="w-3 h-3" /> Example
               </div>
               <p className="text-slate-200 leading-relaxed text-lg font-medium pt-2">
                 {currentQuestion.example || "尚無例句。"}
               </p>
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 border-t border-slate-700">
            <Button 
              className="w-full bg-green-600 hover:bg-green-500 border-green-800 text-xl py-4 shadow-lg shadow-green-900/20"
              onClick={handleFeedbackNext}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderBattleOverlay = () => {
    if (showFeedback) return renderFeedbackOverlay();

    const questionIndex = currentMonsterId!;
    const currentQuestion = gameQueue[questionIndex];
    if (!currentQuestion) return null;

    const isDefToIdiom = gameMode === 'DEF_TO_IDIOM';
    const questionText = isDefToIdiom ? currentQuestion.definition : currentQuestion.word;
    const options = currentOptions;

    return (
      <div className="absolute inset-0 flex flex-col z-40 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <div className="flex justify-between items-start p-2 w-full shrink-0 bg-gradient-to-b from-black/50 to-transparent">
          <div className="w-1/3 max-w-[200px]">
            <HealthBar current={gameState.playerHp} max={gameState.maxPlayerHp} label="Player" isPlayer={true} />
          </div>
          
          <div className="flex flex-col items-center gap-1 mt-1">
            <div className="text-xl font-black text-yellow-400 drop-shadow-md flex items-center gap-2">
               <Swords className="w-5 h-5" /> 
               <span>VS</span>
            </div>
             <button 
              onClick={handleRunAway}
              className="flex items-center gap-1 bg-slate-700/80 hover:bg-red-600/80 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20 transition-all"
            >
              <LogOut className="w-3 h-3" /> Run
            </button>
          </div>

          <div className="w-1/3 max-w-[200px]">
             <HealthBar current={gameState.enemyHp} max={gameState.maxEnemyHp} label="Monster" color="bg-red-500" />
          </div>
        </div>

        <FloatingTextDisplay items={floatingTexts} />

        <div className="flex-1 flex items-center justify-center p-2 w-full min-h-0">
           <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4 items-stretch justify-center h-full max-h-[85vh]">
              {/* Question Area - Shrinked and optimized */}
              <div className="w-full md:w-[32%] bg-slate-800/95 border-2 border-yellow-500/40 rounded-xl p-3 shadow-2xl relative overflow-y-auto flex flex-col items-center justify-center shrink-0 min-h-[80px] max-h-[35vh] md:max-h-full">
                <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 shrink-0 opacity-80">
                  {isDefToIdiom ? "Identify the Idiom" : "Select the Definition"}
                </h2>
                <div className="text-base md:text-xl lg:text-2xl font-black text-white text-center leading-relaxed drop-shadow-md px-1">
                  {questionText}
                </div>
              </div>

              {/* Options Grid - Expanded and prioritized */}
              <div className="w-full md:w-[68%] grid grid-cols-2 gap-3 content-center overflow-y-auto pr-1">
                {options.map((option) => {
                  const isWrong = selectedWrongIds.includes(option.id);
                  return (
                    <Button
                      key={option.id}
                      onClick={() => handleAttack(option)}
                      disabled={isWrong}
                      variant={isWrong ? "secondary" : "secondary"}
                      className={`
                        w-full shadow-md border hover:border-yellow-400/80
                        transition-all duration-150 active:scale-[0.98] flex items-center justify-center
                        ${isDefToIdiom ? 'text-sm md:text-lg lg:text-xl font-bold py-4 md:py-8' : 'text-[11px] md:text-xs lg:text-sm py-3 px-4 text-left leading-tight font-medium'}
                        ${isWrong ? 'opacity-30 cursor-not-allowed border-red-900 bg-slate-800 hover:border-red-900 hover:bg-slate-800' : 'border-slate-600/50 bg-slate-800/80 hover:bg-slate-700'}
                        min-h-[50px] rounded-lg
                      `}
                    >
                      {isDefToIdiom ? option.word : option.definition}
                    </Button>
                  );
                })}
              </div>
           </div>
        </div>
      </div>
    );
  };

  const ReviewModal = () => {
      const [localMode, setLocalMode] = useState<GameMode>('DEF_TO_IDIOM');
      const filtered = wrongIdioms.filter(r => r.mode === localMode);
      
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowReview(false)}>
            <div className="bg-slate-800 border-2 border-slate-600 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-yellow-500" />
                    Review Mistakes
                </h3>
                <div className="flex items-center gap-2">
                    <button 
                    onClick={() => {
                        setWrongIdioms(prev => prev.filter(record => record.mode !== localMode));
                    }}
                    className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors border border-red-900/50"
                    title="Clear current history"
                    >
                    <Trash2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowReview(false)} className="p-1 hover:bg-slate-700 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>
                </div>
                
                <div className="flex border-b border-slate-700 bg-slate-900/30">
                <button 
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${localMode === 'DEF_TO_IDIOM' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => setLocalMode('DEF_TO_IDIOM')}
                >
                    Mode 1 (Def → Idiom)
                </button>
                <button 
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${localMode === 'IDIOM_TO_DEF' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => setLocalMode('IDIOM_TO_DEF')}
                >
                    Mode 2 (Idiom → Def)
                </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-slate-900/30">
                {filtered.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">No mistakes recorded in this mode!</div>
                ) : (
                    <div className="space-y-3">
                    {filtered.map((record, idx) => (
                        <div key={idx} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xl font-bold text-yellow-400">{record.idiom.word}</span>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{record.idiom.definition}</p>
                        {record.idiom.example && (
                            <div className="text-xs text-slate-400 italic bg-slate-800/50 p-2 rounded border border-slate-700">
                            Ex: {record.idiom.example}
                            </div>
                        )}
                        </div>
                    ))}
                    </div>
                )}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="w-full h-screen bg-slate-900 relative font-sans text-slate-100 overflow-hidden">
      
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [0, 20, 20], fov: 50 }}>
          <World 
             playerPos={playerPos} 
             monsters={worldMonsters} 
             props={worldProps}
             onPlayerMove={handlePlayerMove} 
             isBattling={gameState.status === 'BATTLE'}
             isCelebration={isCelebration}
          />
        </Canvas>
      </div>

      {gameState.status === 'MENU' && renderMenu()}
      {gameState.status === 'BATTLE' && renderBattleOverlay()}
      {showReview && <ReviewModal />}
      {showExampleModal && renderExampleModal()}

      {(gameState.status === 'VICTORY' || gameState.status === 'DEFEAT') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-slate-800 p-8 rounded-2xl border-4 border-slate-600 text-center shadow-2xl transform scale-100">
            {gameState.status === 'VICTORY' ? (
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4 drop-shadow-lg animate-bounce" />
            ) : (
              <Skull className="w-24 h-24 text-red-500 mx-auto mb-4 drop-shadow-lg" />
            )}
            <h2 className={`text-5xl font-black mb-2 ${gameState.status === 'VICTORY' ? 'text-yellow-400' : 'text-red-500'}`}>
              {gameState.status === 'VICTORY' ? 'VICTORY!' : 'GAME OVER'}
            </h2>
            <div className="text-2xl mb-8 font-bold text-slate-300">Score: {gameState.score}</div>
            
            <div className="flex gap-4 justify-center">
              <Button onClick={() => setGameState(prev => ({ ...prev, status: 'MENU' }))} variant="secondary">
                Menu
              </Button>
              <Button onClick={() => startGame(gameMode)} variant="primary" className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" /> Play Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {gameState.status === 'EXPLORING' && !isCelebration && (
        <>
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
             <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-600 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-lg">
                  <Trophy className="w-5 h-5" /> Score: {gameState.score}
                </div>
             </div>
             <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-600 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2 text-red-400 font-bold">
                  <Skull className="w-5 h-5" /> Monsters: {worldMonsters.filter(m => !m.isDefeated).length}
                </div>
             </div>
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button 
              onClick={() => setShowReview(true)}
              className="bg-slate-800/80 hover:bg-slate-700/80 p-3 rounded-xl border border-slate-600 shadow-lg text-white transition-all hover:scale-105 active:scale-95"
              title="Review Mistakes"
            >
              <Library className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setGameState(prev => ({ ...prev, status: 'MENU' }))}
              className="bg-slate-800/80 hover:bg-slate-700/80 p-3 rounded-xl border border-slate-600 shadow-lg text-white transition-all hover:scale-105 active:scale-95"
              title="Return to Menu"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 z-30 flex flex-col gap-2 scale-90 origin-bottom-left">
            <div className="flex justify-center">
              <button 
                className="w-14 h-14 bg-slate-800/50 rounded-full border border-slate-500 active:bg-blue-500/50 text-white flex items-center justify-center touch-none select-none hover:bg-slate-700/50 transition-colors"
                onPointerDown={(e) => { e.preventDefault(); (window as any).setVirtualControl('up', true); }}
                onPointerUp={(e) => { e.preventDefault(); (window as any).setVirtualControl('up', false); }}
                onPointerLeave={(e) => { e.preventDefault(); (window as any).setVirtualControl('up', false); }}
              >
                <ArrowUp />
              </button>
            </div>
            <div className="flex gap-2">
               <button 
                className="w-14 h-14 bg-slate-800/50 rounded-full border border-slate-500 active:bg-blue-500/50 text-white flex items-center justify-center touch-none select-none hover:bg-slate-700/50 transition-colors"
                onPointerDown={(e) => { e.preventDefault(); (window as any).setVirtualControl('left', true); }}
                onPointerUp={(e) => { e.preventDefault(); (window as any).setVirtualControl('left', false); }}
                onPointerLeave={(e) => { e.preventDefault(); (window as any).setVirtualControl('left', false); }}
              >
                <ArrowLeft />
              </button>
              <div className="w-14 h-14"></div>
              <button 
                className="w-14 h-14 bg-slate-800/50 rounded-full border border-slate-500 active:bg-blue-500/50 text-white flex items-center justify-center touch-none select-none hover:bg-slate-700/50 transition-colors"
                onPointerDown={(e) => { e.preventDefault(); (window as any).setVirtualControl('right', true); }}
                onPointerUp={(e) => { e.preventDefault(); (window as any).setVirtualControl('right', false); }}
                onPointerLeave={(e) => { e.preventDefault(); (window as any).setVirtualControl('right', false); }}
              >
                <ArrowRight />
              </button>
            </div>
            <div className="flex justify-center">
               <button 
                className="w-14 h-14 bg-slate-800/50 rounded-full border border-slate-500 active:bg-blue-500/50 text-white flex items-center justify-center touch-none select-none hover:bg-slate-700/50 transition-colors"
                onPointerDown={(e) => { e.preventDefault(); (window as any).setVirtualControl('down', true); }}
                onPointerUp={(e) => { e.preventDefault(); (window as any).setVirtualControl('down', false); }}
                onPointerLeave={(e) => { e.preventDefault(); (window as any).setVirtualControl('down', false); }}
              >
                <ArrowDown />
              </button>
            </div>
          </div>

           <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-2 scale-90 origin-bottom-right">
             <div className="flex justify-center">
                 <button 
                 className="w-14 h-14 bg-slate-800/50 rounded-full border border-slate-500 active:bg-yellow-500/50 text-white flex items-center justify-center touch-none select-none hover:bg-slate-700/50 transition-colors"
                 onPointerDown={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateUp', true); }}
                 onPointerUp={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateUp', false); }}
                 onPointerLeave={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateUp', false); }}
               >
                 <ChevronUp />
               </button>
             </div>
             <div className="flex gap-2">
                <button 
                 className="w-14 h-14 bg-slate-800/50 rounded-full border border-slate-500 active:bg-yellow-500/50 text-white flex items-center justify-center touch-none select-none hover:bg-slate-700/50 transition-colors"
                 onPointerDown={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateLeft', true); }}
                 onPointerUp={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateLeft', false); }}
                 onPointerLeave={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateLeft', false); }}
               >
                 <ChevronLeft />
               </button>
               <div className="w-14 h-14"></div>
               <button 
                 className="w-14 h-14 bg-slate-800/50 rounded-full border border-slate-500 active:bg-yellow-500/50 text-white flex items-center justify-center touch-none select-none hover:bg-slate-700/50 transition-colors"
                 onPointerDown={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateRight', true); }}
                 onPointerUp={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateRight', false); }}
                 onPointerLeave={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateRight', false); }}
               >
                 <ChevronRight />
               </button>
             </div>
             <div className="flex justify-center">
               <button 
                 className="w-14 h-14 bg-slate-800/50 rounded-full border border-slate-500 active:bg-yellow-500/50 text-white flex items-center justify-center touch-none select-none hover:bg-slate-700/50 transition-colors"
                 onPointerDown={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateDown', true); }}
                 onPointerUp={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateDown', false); }}
                 onPointerLeave={(e) => { e.preventDefault(); (window as any).setVirtualControl('rotateDown', false); }}
               >
                 <ChevronDown />
               </button>
             </div>
           </div>
        </>
      )}
    </div>
  );
}
