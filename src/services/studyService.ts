import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

export interface StudyRoom {
  id: string;
  name: string;
  createdAt: any;
}

export const studyService = {
  // Collaborative Study Room
  async createStudyRoom(name: string) {
    return await addDoc(collection(db, 'studyRooms'), {
      name,
      createdAt: serverTimestamp()
    });
  },

  // Peer-to-Peer Mentorship
  async requestMentorship(mentorId: string, menteeId: string) {
    return await addDoc(collection(db, 'mentorshipRequests'), {
      mentorId,
      menteeId,
      status: 'pending',
      createdAt: serverTimestamp()
    });
  },

  // Smart AI Flashcard Generator
  async createFlashcardSet(courseId: string, cards: { front: string, back: string }[]) {
    return await addDoc(collection(db, 'flashcardSets'), {
      courseId,
      cards,
      createdAt: serverTimestamp()
    });
  }
};
