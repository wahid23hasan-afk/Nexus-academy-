import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const useStudyFeatures = () => {
  const [features, setFeatures] = useState({
    studyRooms: true,
    aiFlashcards: true,
    mentorship: true,
    offlineAccess: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'appSettings', 'studyFeatures');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setFeatures(docSnap.data() as any);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { features, loading };
};
