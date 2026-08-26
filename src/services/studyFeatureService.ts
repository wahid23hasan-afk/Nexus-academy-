import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';

export const studyFeatureService = {
  // Features Toggle & Settings
  async getStudyFeaturesSettings() {
    const docRef = doc(db, 'appSettings', 'studyFeatures');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      const defaultSettings = {
        studyRooms: true,
        aiFlashcards: true,
        mentorship: true,
        offlineAccess: true,
        updatedAt: serverTimestamp()
      };
      await setDoc(docRef, defaultSettings);
      return defaultSettings;
    }
    return docSnap.data();
  },

  async updateStudyFeatureStatus(feature: string, status: boolean) {
    const docRef = doc(db, 'appSettings', 'studyFeatures');
    await updateDoc(docRef, { [feature]: status, updatedAt: serverTimestamp() });
  },

  // Study Rooms
  async createStudyRoom(name: string, description: string) {
    return await addDoc(collection(db, 'studyRooms'), {
      name,
      description,
      createdAt: serverTimestamp(),
      members: []
    });
  },

  // Flashcards
  async generateFlashcards(courseId: string, content: string) {
    // In production, this would call a cloud function. 
    // Implementing client-side skeleton for demonstration as requested
    console.log('Generating flashcards for:', courseId);
    return [];
  }
};
