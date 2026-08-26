import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useStudyFeatures } from '../hooks/useStudyFeatures';

export const StudyRoomManager: React.FC = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const { features, loading } = useStudyFeatures();

  useEffect(() => {
    if (!features.studyRooms) return;
    const q = query(collection(db, 'studyRooms'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [features.studyRooms]);

  if (loading || !features.studyRooms) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white font-mono uppercase">Active Study Rooms</h3>
      {rooms.map(room => (
        <div key={room.id} className="p-3 bg-slate-800 rounded-lg flex justify-between items-center border border-white/5">
          <span className="text-sm text-slate-200">{room.name}</span>
          <button className="px-3 py-1 bg-[#39FF14] text-black text-[10px] font-bold rounded">JOIN</button>
        </div>
      ))}
    </div>
  );
};
