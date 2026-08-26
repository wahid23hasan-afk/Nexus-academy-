import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  addDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  increment
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Course, CourseSection, Banner, Instructor, CurriculumChapter, CourseReview, CurriculumLesson, Coupon, Offer, CourseBenefit, Purchase, PaymentDetails, PaymentMethodConfig } from '../types/course';
import { offlineStorageService } from './offlineStorageService';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error in courseService: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Default Admin Configured Payment Methods
export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'bkash',
    name: 'bKash Wallet',
    type: 'MFS',
    accountNumber: '01711223344',
    accountType: 'Personal',
    instructions: 'Send Money (Personal) to this number and submit your wallet number below.',
    badge: 'MFS Instant',
    color: 'from-pink-500 to-rose-600',
    icon: '৳',
    isActive: true
  },
  {
    id: 'nagad',
    name: 'Nagad Wallet',
    type: 'MFS',
    accountNumber: '01822334455',
    accountType: 'Personal',
    instructions: 'Send Money (Personal) to Nagad number and enter your 11-digit mobile number.',
    badge: 'MFS Fast',
    color: 'from-orange-500 to-red-600',
    icon: '৳',
    isActive: true
  },
  {
    id: 'rocket',
    name: 'Rocket Wallet',
    type: 'MFS',
    accountNumber: '01933445566',
    accountType: 'Personal',
    instructions: 'Send Money (Personal) to Rocket account and submit your mobile number.',
    badge: 'MFS Safe',
    color: 'from-purple-600 to-indigo-700',
    icon: '৳',
    isActive: true
  },
  {
    id: 'card',
    name: 'Bank Card Gateway',
    type: 'Card',
    accountNumber: 'Online Card Payment',
    accountType: 'Gateway',
    instructions: 'Enter your 16-digit Visa/Mastercard number, holder name, expiry and CVC code.',
    badge: 'Secure Card',
    color: 'from-blue-600 to-cyan-600',
    icon: '💳',
    isActive: true
  }
];

// Helper to normalize payment method details from various Firestore/Admin formats
function normalizePaymentMethod(d: any, defaultId?: string): PaymentMethodConfig | null {
  if (!d || typeof d !== 'object') return null;

  const rawId = (d.id || defaultId || d.name || d.title || '').toString().toLowerCase().replace(/\s+/g, '_');
  let id = 'bkash';
  if (rawId.includes('bkash')) id = 'bkash';
  else if (rawId.includes('nagad')) id = 'nagad';
  else if (rawId.includes('rocket')) id = 'rocket';
  else if (rawId.includes('upay')) id = 'upay';
  else if (rawId.includes('card') || rawId.includes('bank') || rawId.includes('visa') || rawId.includes('mastercard')) id = 'card';
  else id = rawId || 'gateway';

  const accountNumber = (
    d.accountNumber || 
    d.number || 
    d.phone || 
    d.accountPhone || 
    d.account_number || 
    d.account || 
    d.accountNo || 
    d.walletNumber ||
    d.mobileNumber ||
    d.value ||
    ''
  ).toString().trim();

  const name = d.name || d.title || d.accountName || d.methodName || (
    id === 'bkash' ? 'bKash Wallet' :
    id === 'nagad' ? 'Nagad Wallet' :
    id === 'rocket' ? 'Rocket Wallet' :
    id === 'upay' ? 'Upay Wallet' :
    id === 'card' ? 'Bank Card Gateway' : 'Payment Gateway'
  );

  const accountType = d.accountType || d.type || d.accType || d.account_type || 'Personal';
  const instructions = d.instructions || d.customInstructions || d.note || d.description || '';
  const isActive = d.isActive !== false && d.enabled !== false && d.active !== false && d.status !== 'disabled' && d.status !== 'inactive';

  return {
    id,
    name,
    type: (id === 'card' ? 'Card' : 'MFS'),
    accountNumber,
    accountType,
    instructions,
    badge: d.badge || (id === 'card' ? 'Secure Card' : 'MFS Instant'),
    color: d.color || (
      id === 'bkash' ? 'from-pink-500 to-rose-600' :
      id === 'nagad' ? 'from-orange-500 to-red-600' :
      id === 'rocket' ? 'from-purple-600 to-indigo-700' :
      'from-blue-600 to-cyan-600'
    ),
    icon: d.icon || (id === 'card' ? '💳' : '৳'),
    isActive
  };
}

// Mock Coupons, Offers, and Benefits for Student Course Discovery & Checkout
export const MOCK_COUPONS: Coupon[] = [
  {
    couponId: 'coup-1',
    code: 'NEXUS50',
    discountType: 'percent',
    discountValue: 50,
    isActive: true,
    expiryDate: '2030-12-31',
    description: '50% Special Launch Discount'
  },
  {
    couponId: 'coup-2',
    code: 'SAVE200',
    discountType: 'fixed',
    discountValue: 200,
    isActive: true,
    expiryDate: '2030-12-31',
    description: '৳200 Flat Off Coupon'
  },
  {
    couponId: 'coup-3',
    code: 'EXPIRED10',
    discountType: 'percent',
    discountValue: 10,
    isActive: false,
    expiryDate: '2024-01-01',
    description: 'Expired Early Bird Offer'
  },
  {
    couponId: 'coup-4',
    code: 'WELCOME15',
    discountType: 'percent',
    discountValue: 15,
    isActive: true,
    expiryDate: '2030-12-31',
    description: '15% Welcome Bonus Off'
  }
];

export const MOCK_OFFERS: Offer[] = [
  {
    offerId: 'offer-launch',
    title: 'Nexus Launch Promo',
    description: 'Get a special 10% instant checkout discount on all courses!',
    discountPercent: 10,
    badgeText: 'LAUNCH10',
    isActive: true
  }
];

export const MOCK_BENEFITS: CourseBenefit[] = [
  {
    benefitId: 'ben-1',
    title: 'Lifetime Access',
    iconName: 'Lock',
    description: 'Gain indefinite access to the course content and all future updates'
  },
  {
    benefitId: 'ben-2',
    title: 'HD Video Lessons',
    iconName: 'Play',
    description: 'Watch high-definition lessons crystal-clear anytime on any device'
  },
  {
    benefitId: 'ben-3',
    title: 'Downloadable Resources',
    iconName: 'Download',
    description: 'Access comprehensive slide notes, cheat sheets, and blueprints'
  },
  {
    benefitId: 'ben-4',
    title: 'Practice Files & Codes',
    iconName: 'FileCode',
    description: 'Download complete project source files to fast track your learning'
  },
  {
    benefitId: 'ben-5',
    title: 'Interactive Assignments',
    iconName: 'BookOpen',
    description: 'Test your knowledge with real-world projects and automated grading'
  },
  {
    benefitId: 'ben-6',
    title: 'Certificate of Completion',
    iconName: 'Award',
    description: 'Get a high-fidelity academic digital certificate to boost your resume'
  },
  {
    benefitId: 'ben-7',
    title: 'Mobile & Desktop Access',
    iconName: 'Smartphone',
    description: 'Learn comfortably on your phone, tablet, laptop or desktop PC'
  },
  {
    benefitId: 'ben-8',
    title: 'Future Course Updates',
    iconName: 'RefreshCw',
    description: 'Receive all future chapters, material, and system improvements free'
  }
];

// 1. Mock Banners
const MOCK_BANNERS: Banner[] = [
  {
    bannerId: 'banner-1',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
    title: 'Next-Gen Web Development',
    subtitle: 'Master React, Next.js, and Node.js with hands-on projects. Get certified!',
    accentColor: '#39FF14'
  },
  {
    bannerId: 'banner-2',
    imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80',
    title: 'IELTS Band 8.5 Masterclass',
    subtitle: 'Rigorous writing corrections, live spoken sessions, and full length mock tests.',
    accentColor: '#00D4FF'
  },
  {
    bannerId: 'banner-3',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop&q=80',
    title: 'High-Ticket Freelancing Guide',
    subtitle: 'Learn to win international clients on Upwork & Fiverr. Zero to $5k/mo framework.',
    accentColor: '#FF007F'
  }
];

// 2. Mock Instructors
const MOCK_INSTRUCTORS: Instructor[] = [
  {
    instructorId: 'inst-jamil',
    name: 'Engr. Jamil Ahmed',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bio: 'Ex-Lead Software Engineer with 8+ years of industry experience across Web, Mobile, and Distributed Cloud architectures. Dedicated to empowering the next generation of engineers in Bangladesh.',
    experience: '8+ Years Experience',
    totalStudents: 15400,
    totalCourses: 5,
    averageRating: 4.9,
    isVerified: true
  },
  {
    instructorId: 'inst-sarah',
    name: 'Ms. Sarah Connor',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    bio: 'Certified IELTS Trainer and ESL Specialist. Helped over 5,000 students score Band 8.0+ through rigorous personalized assessments and writing corrections.',
    experience: '10+ Years Experience',
    totalStudents: 9800,
    totalCourses: 3,
    averageRating: 4.8,
    isVerified: true
  },
  {
    instructorId: 'inst-rafiq',
    name: 'Dr. Rafiqul Islam',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    bio: 'Associate Professor of Computer Science & Engineering. Researcher in Artificial Intelligence, Big Data Analytics, and Machine Learning applications.',
    experience: '12+ Years Experience',
    totalStudents: 6200,
    totalCourses: 4,
    averageRating: 4.7,
    isVerified: true
  },
  {
    instructorId: 'inst-tasnim',
    name: 'Tasnim Rahman',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    bio: 'Senior UX Designer at a leading tech multinational. Specializes in interaction design, mobile wireframing, heuristic evaluations, and Figma design systems.',
    experience: '6+ Years Experience',
    totalStudents: 8100,
    totalCourses: 2,
    averageRating: 4.9,
    isVerified: true
  },
  {
    instructorId: 'inst-ayman',
    name: 'Ayman Sadiq',
    photoURL: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    bio: 'Founder and Educator. Passionate about soft skills development, freelancing strategy, public speaking, and digital career counseling.',
    experience: '7+ Years Experience',
    totalStudents: 32000,
    totalCourses: 12,
    averageRating: 4.8,
    isVerified: true
  },
  {
    instructorId: 'inst-sajib',
    name: 'Sajib Sutradhar',
    photoURL: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    bio: 'Acclaimed Physics educator with over 150k YouTube subscribers. Pioneer in 3D visualization of physical mechanics and mathematical models.',
    experience: '5+ Years Experience',
    totalStudents: 18000,
    totalCourses: 4,
    averageRating: 4.9,
    isVerified: true
  },
  {
    instructorId: 'inst-hasib',
    name: 'Hasib Rahman',
    photoURL: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=200&auto=format&fit=crop&q=80',
    bio: 'Renowned Higher Mathematics mentor. Specializes in simplified calculus derivation techniques, matrix short tricks, and high-velocity MCQ preparation.',
    experience: '9+ Years Experience',
    totalStudents: 21000,
    totalCourses: 6,
    averageRating: 4.8,
    isVerified: true
  },
  {
    instructorId: 'inst-tanvir',
    name: 'Tanvir Ahmed',
    photoURL: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    bio: 'BUET Alumnus (CSE \'15). Specialist in advanced engineering admission test coaching. Passionate algorithms developer and problem-solving coach.',
    experience: '6+ Years Experience',
    totalStudents: 14500,
    totalCourses: 3,
    averageRating: 4.9,
    isVerified: true
  }
];

// 3. Mock Courses with Course Details expansion
const MOCK_COURSES: Omit<Course, 'createdAt' | 'updatedAt'>[] = [
  {
    courseId: 'course-web-dev',
    title: 'Full Stack Web Development with React & Node',
    subtitle: 'Go from complete absolute beginner to launching production-grade web applications. Deeply master React, Next.js, Node.js, Express, and Firestore.',
    description: 'Learn full-stack engineering with real-world applications. Covers modern HTML5 semantic markup, CSS3 layout engines, Tailwind CSS responsive styling, TypeScript compilation, React interactive hooks, Next.js routing, Node.js server deployment, and Firestore cloud synchronization.',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
    instructor: 'Engr. Jamil Ahmed',
    instructorId: 'inst-jamil',
    category: 'Web Development',
    price: 6000,
    discountPrice: 2499,
    rating: 4.9,
    reviewCount: 384,
    students: 0,
    language: 'Bangla',
    duration: '65 Hours',
    level: 'Intermediate',
    isFeatured: true,
    isBestSeller: true,
    isNew: false,
    lastUpdated: 'June 2026',
    learningOutcomes: [
      'Architect modular full-stack web applications from scratch',
      'Deploy responsive server-side components using Next.js',
      'Optimize database queries with Firebase Firestore',
      'Integrate dynamic state managers with React hooks',
      'Design stunning user interfaces with Tailwind utility classes'
    ],
    skillsGained: ['HTML5 & CSS3', 'Tailwind CSS', 'TypeScript', 'React.js', 'Next.js', 'Express', 'Firebase'],
    requirements: ['Any laptop or computer', 'Stable internet connection', 'No prior coding experience required']
  },
  {
    courseId: 'course-ielts',
    title: 'IELTS Ultimate Academic Preparation Course',
    subtitle: 'The comprehensive Band 8.5 framework for all four IELTS modules. Includes personalized live mock sessions, essay grading, and mock tests.',
    description: 'Complete academic prep program. Detailed diagnostic exams, step-by-step master lessons, intensive writing feedback sessions, high-score vocabulary banks, and professional assessments for listening, reading, writing, and speaking modules.',
    thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80',
    instructor: 'Ms. Sarah Connor',
    instructorId: 'inst-sarah',
    category: 'IELTS',
    price: 4500,
    discountPrice: 1999,
    rating: 4.8,
    reviewCount: 212,
    students: 0,
    language: 'English',
    duration: '32 Hours',
    level: 'All Levels',
    isFeatured: true,
    isBestSeller: false,
    isNew: true,
    lastUpdated: 'July 2026',
    learningOutcomes: [
      'Master the perfect Essay structure for Band 8+ Writing',
      'Employ high-score vocabulary, idioms, and advanced grammatical structures',
      'Tackle advanced Listening tracks and Reading passages with speed-reading keys',
      'Overcome speaking anxiety with weekly mock conversational exercises'
    ],
    skillsGained: ['Academic Writing', 'Speed Reading', 'Fluent Speaking', 'Active Listening', 'Grammar'],
    requirements: ['Intermediate English proficiency', 'Smartphone or PC with Microphone', 'Daily commitment of 1 hour']
  },
  {
    courseId: 'course-python',
    title: 'Python & Data Science for Absolute Beginners',
    subtitle: 'Master the core of Python scripting and leverage NumPy, Pandas, and Scikit-Learn to build real-world data pipelines and prediction models.',
    description: 'Master Python core scripting, NumPy arrays, Pandas dataframes, Matplotlib/Seaborn visualization, and machine learning algorithms with industry-standard datasets.',
    thumbnail: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&auto=format&fit=crop&q=80',
    instructor: 'Dr. Rafiqul Islam',
    instructorId: 'inst-rafiq',
    category: 'Data Science',
    price: 8000,
    discountPrice: 3499,
    rating: 4.7,
    reviewCount: 120,
    students: 0,
    language: 'Bangla',
    duration: '42 Hours',
    level: 'Beginner',
    isFeatured: false,
    isBestSeller: false,
    isNew: true,
    lastUpdated: 'May 2026',
    learningOutcomes: [
      'Write highly clean, pythonic core scripting logic',
      'Cleanse, manipulate, and analyze structured datasets with Pandas',
      'Construct beautiful custom infographics and data visualizations',
      'Develop and deploy regression and classification Machine Learning algorithms'
    ],
    skillsGained: ['Python Core', 'NumPy', 'Pandas', 'Data Visualizations', 'Scikit-Learn', 'Machine Learning'],
    requirements: ['No math or coding backgrounds needed', 'Access to Google Colab or PC for Jupyter Notebooks']
  },
  {
    courseId: 'course-uiux',
    title: 'Modern UI/UX Design Masterclass with Figma',
    subtitle: 'Master user research, wireframing, high-fidelity UI design, advanced interactive prototypes, responsive grid structures, and design handoffs.',
    description: 'Learn modern user experience research methodologies, rapid user persona creation, low-fidelity wireframing, high-fidelity UI design, complex interactive prototyping, responsive grids, design component systems, and engineer handoffs in Figma.',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-26c113006238?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1561070791-26c113006238?w=1200&auto=format&fit=crop&q=80',
    instructor: 'Tasnim Rahman',
    instructorId: 'inst-tasnim',
    category: 'UI/UX Design',
    price: 5000,
    discountPrice: 1499,
    rating: 4.9,
    reviewCount: 410,
    students: 0,
    language: 'Bangla',
    duration: '28 Hours',
    level: 'Beginner',
    isFeatured: true,
    isBestSeller: true,
    isNew: false,
    lastUpdated: 'April 2026',
    learningOutcomes: [
      'Conduct holistic User Experience (UX) research and build wireframes',
      'Formulate beautiful typography, colors, and layout rhythm',
      'Utilize Figma Auto Layout, Variables, and Component libraries like a pro',
      'Animate complex micro-interactions, spring animations, and prototypes'
    ],
    skillsGained: ['UX Research', 'Figma Design', 'Responsive UI', 'Prototyping', 'Component Systems', 'Handoffs'],
    requirements: ['Any working computer', 'Free Figma Account', 'Eagerness to create sleek visuals']
  },
  {
    courseId: 'course-freelance',
    title: 'International Freelancing and Client Acquisition',
    subtitle: 'The blueprint to landing high-ticket clients on Upwork, Fiverr, LinkedIn, and cold email. Learn to negotiate $1k+ retainer contracts.',
    description: 'Complete tactical guide to building a stellar portfolio, bidding on Upwork with persuasive proposals, mastering Fiverr Gig SEO, cold emailing international businesses, LinkedIn networking, client negotiation, and pricing.',
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop&q=80',
    instructor: 'Ayman Sadiq',
    instructorId: 'inst-ayman',
    category: 'Freelancing',
    price: 3000,
    discountPrice: 999,
    rating: 4.6,
    reviewCount: 512,
    students: 0,
    language: 'Bangla',
    duration: '18 Hours',
    level: 'All Levels',
    isFeatured: false,
    isBestSeller: true,
    isNew: false,
    lastUpdated: 'June 2026',
    learningOutcomes: [
      'Write high-conversion Upwork bids and proposals',
      'Optimize Fiverr Gig SEO to rank organically on page 1',
      'Draft highly customized cold emails that win business replies',
      'Structure high-ticket monthly recurring service retainer contracts'
    ],
    skillsGained: ['Upwork Strategy', 'Fiverr SEO', 'Cold Emailing', 'Client Negotiations', 'Proposal Writing'],
    requirements: ['A marketable skill (e.g., Coding, Writing, Design)', 'Polished communication skills']
  },
  {
    courseId: 'course-ssc-physics',
    title: 'SSC Physics Complete Academic Preparation',
    subtitle: 'Complete board exam syllabus preparation for SSC Physics. Concept mapping, formula sheets, creative CQ solving, and MCQ hacks.',
    description: 'Master every chapter of SSC Physics. Detailed physical mechanism visualizations, mathematical derivations, past board year creative question bank solve, and exclusive exam suggestion maps.',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&auto=format&fit=crop&q=80',
    instructor: 'Sajib Sutradhar',
    instructorId: 'inst-sajib',
    category: 'SSC',
    price: 2500,
    discountPrice: 1200,
    rating: 4.9,
    reviewCount: 615,
    students: 0,
    language: 'Bangla',
    duration: '80 Hours',
    level: 'Beginner',
    isFeatured: true,
    isBestSeller: true,
    isNew: false,
    lastUpdated: 'July 2026',
    learningOutcomes: [
      'Visualize and derive advanced concepts in Force, Mechanics, and Energy',
      'Solve creative board question papers (CQ) in under 20 minutes',
      'Utilize visual tricks to solve confusing MCQ questions instantly',
      'Organize standard board exam formulas and shortcut guides'
    ],
    skillsGained: ['Physical Mechanics', 'Creative CQ Solving', 'MCQ Shortcuts', 'Concept Mapping', 'Exam Visuals'],
    requirements: ['Syllabus textbook', 'Scientific Calculator', 'Basic smartphone/internet']
  },
  {
    courseId: 'course-hsc-math',
    title: 'HSC Higher Mathematics Complete Course',
    subtitle: 'Detailed mathematical preparation for HSC Higher Math 1st & 2nd paper. Core calculus shortcuts, matrix techniques, and exam mock sets.',
    description: 'Master First Paper and Second Paper Higher Math chapters. Core integration and calculus derivations, matrix shortcuts, conic sections, vectors, statics, dynamics, and high speed MCQ tricks.',
    thumbnail: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&auto=format&fit=crop&q=80',
    instructor: 'Hasib Rahman',
    instructorId: 'inst-hasib',
    category: 'HSC',
    price: 3500,
    discountPrice: 1800,
    rating: 4.8,
    reviewCount: 340,
    students: 0,
    language: 'Bangla',
    duration: '110 Hours',
    level: 'Intermediate',
    isFeatured: false,
    isBestSeller: false,
    isNew: false,
    lastUpdated: 'May 2026',
    learningOutcomes: [
      'Solve high-level Calculus integration and differentiation effortlessly',
      'Apply quick determinant/matrix tricks for rapid solving',
      'Crack trigonometric identity proofs with shortcut maps',
      'Excel in the HSC board CQ exam layout rules'
    ],
    skillsGained: ['Calculus Shortcuts', 'Trigonometric Derivations', 'Statics & Dynamics', 'CQ Layout Mastery'],
    requirements: ['Scientific Calculator (991EX preferred)', 'Math standard reference text']
  },
  {
    courseId: 'course-buet',
    title: 'BUET & Engineering Admission Prep Program',
    subtitle: 'The ultimate advanced coaching program for BUET, RUET, KUET, CUET, and IUT admission challenges. High-difficulty physics, chemistry, and math.',
    description: 'Intense advanced coaching program covering elite engineering admission topics. Advanced concepts in thermodynamics, electromagnetic induction, organic chemistry synthesis, and multi-variable higher algebra shortcuts.',
    thumbnail: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&auto=format&fit=crop&q=80',
    instructor: 'Tanvir Ahmed',
    instructorId: 'inst-tanvir',
    category: 'Admission',
    price: 12000,
    discountPrice: 5999,
    rating: 4.9,
    reviewCount: 780,
    students: 0,
    language: 'Bangla',
    duration: '150 Hours',
    level: 'Advanced',
    isFeatured: true,
    isBestSeller: true,
    isNew: false,
    lastUpdated: 'June 2026',
    learningOutcomes: [
      'Crack complex multi-step physics problems in electromagnetism',
      'Master rapid organic chemistry synthesis conversions and mechanics',
      'Employ highly optimized mathematical shortcuts to tackle 3-minute queries',
      'Attempt mock full-length engineering admissions with absolute composure'
    ],
    skillsGained: ['Advanced Electromagnetism', 'Organic Synthesis', 'Admission Time Management', 'Higher Algebra'],
    requirements: ['Strong HSC background foundations', 'High engineering exam dedication']
  }
];

// Helper to procedural generate mock chapters & reviews to keep DB lightweight and simple
const generateMockChaptersForCourse = (courseId: string): CurriculumChapter[] => {
  return [
    {
      chapterId: `${courseId}-ch1`,
      courseId: courseId,
      title: 'Chapter 1: Getting Started & Foundations',
      sequenceOrder: 1,
      lessonsCount: 4,
      totalDuration: '2h 15m',
      lessons: [
        { lessonId: `${courseId}-l1`, title: 'Course Orientation & Master Syllabus', duration: '12:45', isPreviewAllowed: true, sequenceOrder: 1 },
        { lessonId: `${courseId}-l2`, title: 'Foundational Theory & Environment Setup', duration: '28:10', isPreviewAllowed: true, sequenceOrder: 2 },
        { lessonId: `${courseId}-l3`, title: 'Setting Up Core Dev Tools & Workspace configuration', duration: '45:30', isPreviewAllowed: false, sequenceOrder: 3 },
        { lessonId: `${courseId}-l4`, title: 'Chapter Summary & Quick Quiz Checkpoint', duration: '15:20', isPreviewAllowed: false, sequenceOrder: 4 }
      ]
    },
    {
      chapterId: `${courseId}-ch2`,
      courseId: courseId,
      title: 'Chapter 2: Deep Core Fundamentals',
      sequenceOrder: 2,
      lessonsCount: 3,
      totalDuration: '3h 40m',
      lessons: [
        { lessonId: `${courseId}-l5`, title: 'Core Mechanics, Principles, and Deep Dive', duration: '55:10', isPreviewAllowed: true, sequenceOrder: 5 },
        { lessonId: `${courseId}-l6`, title: 'Hands-on Coding, Visual mapping, and Debugging', duration: '1:12:45', isPreviewAllowed: false, sequenceOrder: 6 },
        { lessonId: `${courseId}-l7`, title: 'Deploying custom architectures & configurations', duration: '42:15', isPreviewAllowed: false, sequenceOrder: 7 }
      ]
    },
    {
      chapterId: `${courseId}-ch3`,
      courseId: courseId,
      title: 'Chapter 3: Elite Implementation & Final Handoffs',
      sequenceOrder: 3,
      lessonsCount: 3,
      totalDuration: '4h 12m',
      lessons: [
        { lessonId: `${courseId}-l8`, title: 'Optimizing and Refactoring production schemas', duration: '1:05:40', isPreviewAllowed: false, sequenceOrder: 8 },
        { lessonId: `${courseId}-l9`, title: 'Rigorous Testing, Troubleshooting, and Edge-Cases', duration: '48:30', isPreviewAllowed: false, sequenceOrder: 9 },
        { lessonId: `${courseId}-l10`, title: 'Deployment, Client Handover, and Certification guides', duration: '58:20', isPreviewAllowed: false, sequenceOrder: 10 }
      ]
    }
  ];
};

const generateMockReviewsForCourse = (courseId: string): CourseReview[] => {
  return [
    {
      reviewId: `${courseId}-rev1`,
      courseId: courseId,
      studentName: 'Md. Al-Amin',
      studentPhotoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      rating: 5,
      comment: 'Absolutely amazing! The depth of explanations is unmatched. This completely transformed my conceptual understanding.',
      createdAt: '3 days ago'
    },
    {
      reviewId: `${courseId}-rev2`,
      courseId: courseId,
      studentName: 'Fatema Tuz Zahra',
      studentPhotoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      rating: 5,
      comment: 'Very practical, comprehensive, and highly engaging. Got my career breakthrough right after completing this track!',
      createdAt: '1 week ago'
    },
    {
      reviewId: `${courseId}-rev3`,
      courseId: courseId,
      studentName: 'S.M. Sazzad',
      studentPhotoURL: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
      rating: 4.8,
      comment: 'Incredibly detailed curriculum. Each chapter contains high-quality guidelines and robust cheat sheets.',
      createdAt: '2 weeks ago'
    }
  ];
};

export const courseService = {
  // Seed initial banners, courses, instructors, reviews, curriculum if database empty
  async seedDatabaseIfEmpty(): Promise<void> {
    try {
      // 1. Check & Seed Banners
      const bannersRef = collection(db, 'banners');
      const bannersSnap = await getDocs(bannersRef);
      if (bannersSnap.empty) {
        console.log('Seeding initial banners to Firestore...');
        for (const b of MOCK_BANNERS) {
          await setDoc(doc(db, 'banners', b.bannerId), b);
        }
      }

      // 2. Check & Seed Instructors
      const instructorsRef = collection(db, 'instructors');
      const instructorsSnap = await getDocs(instructorsRef);
      if (instructorsSnap.empty) {
        console.log('Seeding initial instructors to Firestore...');
        for (const i of MOCK_INSTRUCTORS) {
          await setDoc(doc(db, 'instructors', i.instructorId), i);
        }
      }

      // 3. Check & Seed Courses
      const coursesRef = collection(db, 'courses');
      const coursesSnap = await getDocs(coursesRef);
      if (coursesSnap.empty) {
        console.log('Seeding initial courses to Firestore...');
        for (const c of MOCK_COURSES) {
          await setDoc(doc(db, 'courses', c.courseId), {
            ...c,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      // 4. Check & Seed Curriculum Chapters
      const curriculumRef = collection(db, 'courseCurriculum');
      const curriculumSnap = await getDocs(curriculumRef);
      if (curriculumSnap.empty) {
        console.log('Seeding initial curriculums to Firestore...');
        for (const c of MOCK_COURSES) {
          const chapters = generateMockChaptersForCourse(c.courseId);
          for (const ch of chapters) {
            await setDoc(doc(db, 'courseCurriculum', ch.chapterId), ch);
          }
        }
      }

      // 5. Check & Seed Course Reviews
      const reviewsRef = collection(db, 'courseReviews');
      const reviewsSnap = await getDocs(reviewsRef);
      if (reviewsSnap.empty) {
        console.log('Seeding initial reviews to Firestore...');
        for (const c of MOCK_COURSES) {
          const reviews = generateMockReviewsForCourse(c.courseId);
          for (const rev of reviews) {
            await setDoc(doc(db, 'courseReviews', rev.reviewId), rev);
          }
        }
      }

      // 6. Check & Seed Coupons
      const couponsRef = collection(db, 'coupons');
      const couponsSnap = await getDocs(couponsRef);
      if (couponsSnap.empty) {
        console.log('Seeding initial coupons to Firestore...');
        for (const coup of MOCK_COUPONS) {
          await setDoc(doc(db, 'coupons', coup.couponId), coup);
        }
      }

      // 7. Check & Seed Offers
      const offersRef = collection(db, 'offers');
      const offersSnap = await getDocs(offersRef);
      if (offersSnap.empty) {
        console.log('Seeding initial offers to Firestore...');
        for (const offer of MOCK_OFFERS) {
          await setDoc(doc(db, 'offers', offer.offerId), offer);
        }
      }

      // 8. Check & Seed Course Benefits
      const benefitsRef = collection(db, 'courseBenefits');
      const benefitsSnap = await getDocs(benefitsRef);
      if (benefitsSnap.empty) {
        console.log('Seeding initial course benefits to Firestore...');
        for (const ben of MOCK_BENEFITS) {
          await setDoc(doc(db, 'courseBenefits', ben.benefitId), ben);
        }
      }

    } catch (error) {
      console.warn('Silent seeding failure (possibly due to Firestore rules/offline):', error);
    }
  },

  // Fetch Banners
  async getBanners(): Promise<Banner[]> {
    const bannersPath = 'banners';
    try {
      const bannersSnap = await getDocs(collection(db, bannersPath));
      if (bannersSnap.empty) {
        return MOCK_BANNERS;
      }
      return bannersSnap.docs.map(docSnap => docSnap.data() as Banner);
    } catch (error) {
      console.warn('Failed to fetch banners, returning mock data:', error);
      return MOCK_BANNERS;
    }
  },

  // Helper to aggregate real-time enrollment counts per courseId from purchases & myCourses & local storage
  async getCourseStudentCountsMap(): Promise<Record<string, number>> {
    const countMap: Record<string, Set<string>> = {};

    const addEnrollment = (courseId: string, userKey: string) => {
      if (!courseId) return;
      if (!countMap[courseId]) countMap[courseId] = new Set();
      countMap[courseId].add(userKey || 'anon_' + Math.random());
    };

    try {
      const purchasesSnap = await getDocs(collection(db, 'purchases')).catch(() => null);
      if (purchasesSnap && !purchasesSnap.empty) {
        purchasesSnap.docs.forEach(d => {
          const data = d.data();
          if (data.courseId) {
            addEnrollment(data.courseId, data.userId || data.userEmail || d.id);
          }
        });
      }

      const myCoursesSnap = await getDocs(collection(db, 'myCourses')).catch(() => null);
      if (myCoursesSnap && !myCoursesSnap.empty) {
        myCoursesSnap.docs.forEach(d => {
          const data = d.data();
          if (data.courseId) {
            addEnrollment(data.courseId, data.userId || data.userEmail || d.id);
          }
        });
      }
    } catch (e) {
      console.warn('Failed getting Firestore enrollment snapshots:', e);
    }

    try {
      const localPurchases: Purchase[] = JSON.parse(localStorage.getItem('nexus_db_purchases') || '[]');
      localPurchases.forEach(p => {
        if (p.courseId) addEnrollment(p.courseId, p.userId || p.userEmail || p.purchaseId);
      });

      const localMyCourses: any[] = JSON.parse(localStorage.getItem('nexus_my_courses') || '[]');
      localMyCourses.forEach(m => {
        if (m.courseId) addEnrollment(m.courseId, m.userId || m.userEmail || m.courseId);
      });

      const localEnrollments: string[] = JSON.parse(localStorage.getItem('nexus_enrollments') || '[]');
      const currentUserKey = auth.currentUser?.uid || auth.currentUser?.email || 'current_user';
      localEnrollments.forEach(cId => {
        addEnrollment(cId, currentUserKey);
      });
    } catch (e) {}

    const result: Record<string, number> = {};
    Object.keys(countMap).forEach(cId => {
      result[cId] = countMap[cId].size;
    });
    return result;
  },

  // Increment Course Student Count
  async incrementCourseStudents(courseId: string): Promise<void> {
    if (!courseId) return;
    try {
      const courseDocRef = doc(db, 'courses', courseId);
      await updateDoc(courseDocRef, {
        students: increment(1),
        updatedAt: serverTimestamp()
      }).catch(async () => {
        await setDoc(courseDocRef, { students: 1 }, { merge: true }).catch(() => {});
      });
    } catch (err) {
      console.warn('Failed to increment course students count:', err);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_purchases_updated'));
    }
  },

  // Fetch Courses with complete filtering and sorting support
  async getCourses(
    filters: {
      category?: string;
      priceType?: 'all' | 'free' | 'premium';
      isBestSeller?: boolean;
      isNew?: boolean;
      rating?: number;
      searchQuery?: string;
    } = {},
    sortBy: 'newest' | 'popular' | 'rated' | 'priceAsc' | 'priceDesc' = 'popular'
  ): Promise<Course[]> {
    const coursesPath = 'courses';
    try {
      const coursesSnap = await getDocs(collection(db, coursesPath));
      let courses: Course[] = [];

      if (!coursesSnap.empty) {
        courses = coursesSnap.docs.map(docSnap => {
          const data = docSnap.data();
          const learningOutcomes = Array.isArray(data.learningOutcomes)
            ? data.learningOutcomes
            : typeof data.learningOutcomes === 'string'
              ? data.learningOutcomes.split('\n').flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean)
              : [];
          const skillsGained = Array.isArray(data.skillsGained)
            ? data.skillsGained
            : typeof data.skillsGained === 'string'
              ? data.skillsGained.split(',').map(s => s.trim()).filter(Boolean)
              : [];
          const requirements = Array.isArray(data.requirements)
            ? data.requirements
            : typeof data.requirements === 'string'
              ? data.requirements.split(',').map(s => s.trim()).filter(Boolean)
              : [];
          return {
            ...data,
            learningOutcomes,
            skillsGained,
            requirements,
            courseId: docSnap.id,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          } as Course;
        });
        // Cache courses in IndexedDB for offline persistence
        offlineStorageService.cacheCourses(courses).catch(console.warn);
      } else {
        courses = MOCK_COURSES.map(c => ({
          ...c,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        })) as unknown as Course[];
        offlineStorageService.cacheCourses(courses).catch(console.warn);
      }

      // Enrich courses with real-time student count map
      const countsMap = await this.getCourseStudentCountsMap();
      courses = courses.map(c => ({
        ...c,
        students: countsMap[c.courseId] || 0
      }));

      // Filter category
      if (filters.category && filters.category !== 'All') {
        courses = courses.filter(c => c.category?.toLowerCase() === filters.category?.toLowerCase());
      }

      // Price type
      if (filters.priceType && filters.priceType !== 'all') {
        if (filters.priceType === 'free') {
          courses = courses.filter(c => (c.discountPrice || c.price) === 0);
        } else if (filters.priceType === 'premium') {
          courses = courses.filter(c => (c.discountPrice || c.price) > 0);
        }
      }

      // Badges
      if (filters.isBestSeller) {
        courses = courses.filter(c => c.isBestSeller);
      }
      if (filters.isNew) {
        courses = courses.filter(c => c.isNew);
      }
      if (filters.rating) {
        courses = courses.filter(c => c.rating >= (filters.rating || 0));
      }

      // Search Query
      if (filters.searchQuery) {
        const queryClean = filters.searchQuery.toLowerCase().trim();
        courses = courses.filter(c => 
          c.title?.toLowerCase().includes(queryClean) ||
          c.instructor?.toLowerCase().includes(queryClean) ||
          c.category?.toLowerCase().includes(queryClean) ||
          c.description?.toLowerCase().includes(queryClean)
        );
      }

      // Sort
      courses.sort((a, b) => {
        const priceA = a.discountPrice !== undefined ? a.discountPrice : a.price;
        const priceB = b.discountPrice !== undefined ? b.discountPrice : b.price;

        if (sortBy === 'newest') {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.isNew ? 2 : 1);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.isNew ? 2 : 1);
          return dateB - dateA;
        } else if (sortBy === 'popular') {
          return (b.students || 0) - (a.students || 0);
        } else if (sortBy === 'rated') {
          return (b.rating || 0) - (a.rating || 0);
        } else if (sortBy === 'priceAsc') {
          return priceA - priceB;
        } else if (sortBy === 'priceDesc') {
          return priceB - priceA;
        }
        return 0;
      });

      return courses;
    } catch (error) {
      console.warn('Failed to fetch courses from Firestore, attempting IndexedDB offline cache:', error);
      const cachedCourses = await offlineStorageService.getCachedCourses();
      if (cachedCourses && cachedCourses.length > 0) {
        let courses = [...cachedCourses];
        if (filters.category && filters.category !== 'All') {
          courses = courses.filter(c => c.category?.toLowerCase() === filters.category?.toLowerCase());
        }
        if (filters.searchQuery) {
          const queryClean = filters.searchQuery.toLowerCase().trim();
          courses = courses.filter(c => 
            c.title?.toLowerCase().includes(queryClean) ||
            c.instructor?.toLowerCase().includes(queryClean) ||
            c.category?.toLowerCase().includes(queryClean)
          );
        }
        return courses;
      }
      return MOCK_COURSES.map(c => ({
        ...c,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() }
      })) as unknown as Course[];
    }
  },

  // Subscribe to live all-courses updates with onSnapshot for real-time student count and catalog sync
  subscribeCourses(
    filters: {
      category?: string;
      priceType?: 'all' | 'free' | 'premium';
      isBestSeller?: boolean;
      isNew?: boolean;
      rating?: number;
      searchQuery?: string;
    } = {},
    sortBy: 'newest' | 'popular' | 'rated' | 'priceAsc' | 'priceDesc' = 'popular',
    onUpdate: (courses: Course[]) => void,
    onError?: (err: any) => void
  ) {
    const coursesPath = 'courses';
    const coursesCol = collection(db, coursesPath);
    const purchasesCol = collection(db, 'purchases');

    let currentRawCourses: Course[] = [];

    const emitUpdatedCourses = async () => {
      if (!currentRawCourses || currentRawCourses.length === 0) return;
      const countsMap = await this.getCourseStudentCountsMap();
      let courses = currentRawCourses.map(c => ({
        ...c,
        students: countsMap[c.courseId] || 0
      }));

      // Apply filters
      if (filters.category && filters.category !== 'All') {
        courses = courses.filter(c => c.category?.toLowerCase() === filters.category?.toLowerCase());
      }

      if (filters.priceType && filters.priceType !== 'all') {
        if (filters.priceType === 'free') {
          courses = courses.filter(c => (c.discountPrice || c.price) === 0);
        } else if (filters.priceType === 'premium') {
          courses = courses.filter(c => (c.discountPrice || c.price) > 0);
        }
      }

      if (filters.isBestSeller) {
        courses = courses.filter(c => c.isBestSeller);
      }
      if (filters.isNew) {
        courses = courses.filter(c => c.isNew);
      }
      if (filters.rating) {
        courses = courses.filter(c => (c.rating || 0) >= (filters.rating || 0));
      }

      if (filters.searchQuery) {
        const queryClean = filters.searchQuery.toLowerCase().trim();
        courses = courses.filter(c => 
          c.title?.toLowerCase().includes(queryClean) ||
          c.instructor?.toLowerCase().includes(queryClean) ||
          c.category?.toLowerCase().includes(queryClean) ||
          c.description?.toLowerCase().includes(queryClean)
        );
      }

      // Apply sorting
      courses.sort((a, b) => {
        const priceA = a.discountPrice !== undefined ? a.discountPrice : a.price;
        const priceB = b.discountPrice !== undefined ? b.discountPrice : b.price;

        if (sortBy === 'newest') {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.isNew ? 2 : 1);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.isNew ? 2 : 1);
          return dateB - dateA;
        } else if (sortBy === 'popular') {
          return (b.students || 0) - (a.students || 0);
        } else if (sortBy === 'rated') {
          return (b.rating || 0) - (a.rating || 0);
        } else if (sortBy === 'priceAsc') {
          return priceA - priceB;
        } else if (sortBy === 'priceDesc') {
          return priceB - priceA;
        }
        return 0;
      });

      // Cache fetched live courses in IndexedDB for offline persistence
      offlineStorageService.cacheCourses(courses).catch(console.warn);

      onUpdate(courses);
    };

    const unsubCourses = onSnapshot(
      coursesCol,
      (snapshot) => {
        if (!snapshot.empty) {
          currentRawCourses = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const learningOutcomes = Array.isArray(data.learningOutcomes)
              ? data.learningOutcomes
              : typeof data.learningOutcomes === 'string'
                ? data.learningOutcomes.split('\n').flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean)
                : [];
            const skillsGained = Array.isArray(data.skillsGained)
              ? data.skillsGained
              : typeof data.skillsGained === 'string'
                ? data.skillsGained.split(',').map(s => s.trim()).filter(Boolean)
                : [];
            const requirements = Array.isArray(data.requirements)
              ? data.requirements
              : typeof data.requirements === 'string'
                ? data.requirements.split(',').map(s => s.trim()).filter(Boolean)
                : [];
            return {
              ...data,
              learningOutcomes,
              skillsGained,
              requirements,
              courseId: docSnap.id,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            } as Course;
          });
        } else {
          currentRawCourses = MOCK_COURSES.map(c => ({
            ...c,
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() }
          })) as unknown as Course[];
        }

        emitUpdatedCourses();
      },
      (err) => {
        console.warn('Firestore onSnapshot listen failed for courses, attempting IndexedDB offline cache:', err);
        offlineStorageService.getCachedCourses().then((cached) => {
          if (cached && cached.length > 0) {
            onUpdate(cached);
          }
        }).catch(console.warn);
        if (onError) onError(err);
      }
    );

    const unsubPurchases = onSnapshot(
      purchasesCol,
      () => {
        emitUpdatedCourses();
      },
      (err) => console.warn('Purchases subscription warning:', err)
    );

    const handleLocalUpdate = () => {
      emitUpdatedCourses();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('nexus_purchases_updated', handleLocalUpdate);
    }

    return () => {
      unsubCourses();
      unsubPurchases();
      if (typeof window !== 'undefined') {
        window.removeEventListener('nexus_purchases_updated', handleLocalUpdate);
      }
    };
  },

  // Fetch Single Instructor Details
  async getInstructor(instructorId: string): Promise<Instructor | null> {
    try {
      const snap = await getDoc(doc(db, 'instructors', instructorId));
      if (snap.exists()) {
        return snap.data() as Instructor;
      }
      // Fallback
      const found = MOCK_INSTRUCTORS.find(i => i.instructorId === instructorId);
      return found || null;
    } catch (err) {
      console.warn(`Failed to fetch instructor ${instructorId}, returning mock fallback:`, err);
      return MOCK_INSTRUCTORS.find(i => i.instructorId === instructorId) || null;
    }
  },

  // Subscribe to live course updates with onSnapshot
  subscribeCourse(courseId: string, onUpdate: (course: Course) => void, onError?: (err: any) => void) {
    const courseDocRef = doc(db, 'courses', courseId);
    return onSnapshot(
      courseDocRef,
      async (snap) => {
        if (snap.exists()) {
          const countsMap = await this.getCourseStudentCountsMap();
          onUpdate({ ...snap.data(), courseId: snap.id, students: countsMap[snap.id] || 0 } as Course);
        }
      },
      (err) => {
        console.error('Firestore subscribeCourse error:', err);
        handleFirestoreError(err, OperationType.GET, `courses/${courseId}`);
        if (onError) onError(err);
      }
    );
  },

  // Update course sections in Firestore directly
  async updateCourseSections(courseId: string, sections: CourseSection[]): Promise<void> {
    try {
      const courseDocRef = doc(db, 'courses', courseId);
      await updateDoc(courseDocRef, {
        sections,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating course sections:', err);
      handleFirestoreError(err, OperationType.UPDATE, `courses/${courseId}`);
    }
  },

  // Fetch Course Curriculum
  async getCurriculum(courseId: string): Promise<CurriculumChapter[]> {
    try {
      // 1. Check if course document in 'courses' collection has sections
      const courseDocRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseDocRef);
      if (courseSnap.exists()) {
        const cData = courseSnap.data() as Course;
        if (cData.sections && Array.isArray(cData.sections) && cData.sections.length > 0) {
          return cData.sections.map((sec, sIdx) => ({
            chapterId: sec.sectionId || sec.id || `chap-${sIdx + 1}`,
            courseId,
            title: sec.title,
            sequenceOrder: sec.sequenceOrder || sIdx + 1,
            lessons: (sec.lessons || []).map((les, lIdx) => ({
              lessonId: les.lessonId || les.id || `les-${sIdx + 1}-${lIdx + 1}`,
              chapterId: sec.sectionId || sec.id || `chap-${sIdx + 1}`,
              title: les.title,
              duration: les.duration || '12:30',
              sequenceOrder: les.sequenceOrder || lIdx + 1,
              isPreviewAllowed: les.isPreviewAllowed ?? les.isFreePreview,
              videoUrl: les.videoUrl,
              thumbnailUrl: les.thumbnailUrl
            }))
          }));
        }
      }

      // 2. Query 'courseCurriculum' collection
      const q = query(collection(db, 'courseCurriculum'), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const chapters = snap.docs.map(d => d.data() as CurriculumChapter);
        chapters.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
        return chapters;
      }
      return generateMockChaptersForCourse(courseId);
    } catch (err) {
      console.warn(`Failed to fetch curriculum for ${courseId}, returning mock fallback:`, err);
      return generateMockChaptersForCourse(courseId);
    }
  },

  // Fetch Course Reviews from "reviews" collection
  async getReviews(courseId: string): Promise<CourseReview[]> {
    try {
      const q = query(collection(db, 'reviews'), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs
          .map(d => {
            const data = d.data();
            return {
              reviewId: d.id,
              courseId: data.courseId,
              studentName: data.userName || data.studentName || data.userEmail || 'Verified Learner',
              studentPhotoURL: data.studentPhotoURL || '',
              rating: Number(data.rating || 5),
              comment: data.comment || '',
              createdAt: typeof data.createdAt === 'string'
                ? new Date(data.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                : (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()),
              status: data.status || 'approved'
            } as CourseReview & { status?: string };
          })
          .filter(r => r.status !== 'hidden');
      }

      // Legacy fallback check on 'courseReviews'
      const legacyQ = query(collection(db, 'courseReviews'), where('courseId', '==', courseId));
      const legacySnap = await getDocs(legacyQ);
      if (!legacySnap.empty) {
        return legacySnap.docs.map(d => d.data() as CourseReview);
      }

      return generateMockReviewsForCourse(courseId);
    } catch (err) {
      console.warn(`Failed to fetch reviews for ${courseId}, returning mock fallback:`, err);
      return generateMockReviewsForCourse(courseId);
    }
  },

  // Submit/Add a Course Review to "reviews" collection and update average rating in the course doc
  async addReview(review: Omit<CourseReview, 'reviewId' | 'createdAt'> & {
    courseTitle?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    status?: string;
    createdAt?: string;
  }): Promise<CourseReview> {
    const currentUser = auth.currentUser;
    const createdAtIso = review.createdAt || new Date().toISOString();

    const payload = {
      courseId: review.courseId,
      courseTitle: review.courseTitle || '',
      userId: review.userId || currentUser?.uid || 'guest_student',
      userName: review.userName || review.studentName || currentUser?.displayName || 'Verified Learner',
      userEmail: review.userEmail || currentUser?.email || '',
      rating: Number(review.rating) || 5,
      comment: review.comment ? review.comment.trim() : '',
      status: review.status || 'approved',
      createdAt: createdAtIso
    };

    let reviewId = '';
    try {
      // 1. Write the new review doc to "reviews" collection with auto-generated document ID
      const docRef = await addDoc(collection(db, 'reviews'), payload);
      reviewId = docRef.id;

      // Also set doc in legacy courseReviews for complete backwards compatibility
      const legacyReview: CourseReview = {
        ...review,
        reviewId,
        createdAt: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      };
      await setDoc(doc(db, 'courseReviews', reviewId), legacyReview);

      // 2. Fetch all reviews for this course to calculate the correct rating
      const reviewsQuery = query(collection(db, 'reviews'), where('courseId', '==', review.courseId));
      const snap = await getDocs(reviewsQuery);
      let totalRating = 0;
      let reviewCount = 0;
      
      snap.forEach(d => {
        const data = d.data();
        if (data.status !== 'hidden') {
          totalRating += Number(data.rating || 0);
          reviewCount++;
        }
      });

      const averageRating = reviewCount > 0 ? Number((totalRating / reviewCount).toFixed(1)) : Number(review.rating.toFixed(1));

      // 3. Update the course document with the new averageRating and reviewCount
      const courseDocRef = doc(db, 'courses', review.courseId);
      const courseDocSnap = await getDoc(courseDocRef);
      if (courseDocSnap.exists()) {
        await updateDoc(courseDocRef, {
          rating: averageRating,
          averageRating: averageRating,
          reviewCount: reviewCount
        });
      }

      return {
        reviewId,
        courseId: review.courseId,
        studentName: payload.userName,
        studentPhotoURL: review.studentPhotoURL || '',
        rating: payload.rating,
        comment: payload.comment,
        createdAt: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      };
    } catch (err) {
      console.error('Error adding course review to reviews collection:', err);
      handleFirestoreError(err, OperationType.WRITE, 'reviews');
      return {
        reviewId: reviewId || 'rev_' + Date.now(),
        courseId: review.courseId,
        studentName: payload.userName,
        studentPhotoURL: review.studentPhotoURL || '',
        rating: payload.rating,
        comment: payload.comment,
        createdAt: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      };
    }
  },

  // Fetch Coupons with strict sanitization to prevent undefined values
  async getCoupons(): Promise<Coupon[]> {
    try {
      const snap = await getDocs(collection(db, 'coupons'));
      if (!snap.empty) {
        const list = snap.docs.map(d => {
          const data = d.data();
          return {
            couponId: d.id || data.couponId || 'coup-' + Math.random().toString(36).substring(2, 7),
            code: String(data.code || data.couponCode || data.name || 'PROMO').toUpperCase(),
            discountType: (data.discountType || data.type || 'percent') === 'fixed' ? 'fixed' : 'percent',
            discountValue: Number(data.discountValue ?? data.discount ?? data.value ?? 0),
            isActive: data.isActive !== false,
            expiryDate: data.expiryDate || '2030-12-31',
            description: data.description || 'Promotional Discount'
          } as Coupon;
        }).filter(c => c.isActive);
        if (list.length > 0) return list;
      }
    } catch (err) {
      console.warn('Failed to fetch coupons from Firestore, checking fallback/mocks:', err);
    }
    const local = localStorage.getItem('nexus_db_coupons');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        const filtered = parsed.filter((c: any) => c.isActive);
        if (filtered.length > 0) return filtered;
      } catch { /* ignore */ }
    }
    // Return only active valid mock coupons without expired ones
    return MOCK_COUPONS.filter(c => c.isActive && c.code !== 'EXPIRED10');
  },

  // Save/Add Coupon (Admin)
  async saveCoupon(couponData: Omit<Coupon, 'couponId'> & { couponId?: string }): Promise<Coupon> {
    const couponId = couponData.couponId || 'coup-' + Math.random().toString(36).substring(2, 9);
    const newCoupon: Coupon = {
      couponId,
      code: couponData.code.trim().toUpperCase(),
      discountType: couponData.discountType,
      discountValue: Number(couponData.discountValue),
      isActive: couponData.isActive,
      expiryDate: couponData.expiryDate || '2030-12-31',
      description: couponData.description || `${couponData.discountType === 'percent' ? couponData.discountValue + '%' : '৳' + couponData.discountValue} Off`
    };

    try {
      await setDoc(doc(db, 'coupons', couponId), newCoupon);
    } catch (err) {
      console.warn('Failed to save coupon to Firestore, saving to localStorage:', err);
    }

    const current = await this.getCoupons();
    const updated = [newCoupon, ...current.filter(c => c.couponId !== couponId)];
    localStorage.setItem('nexus_db_coupons', JSON.stringify(updated));
    return newCoupon;
  },

  // Delete Coupon (Admin)
  async deleteCoupon(couponId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'coupons', couponId));
    } catch (err) {
      console.warn('Failed deleting coupon from Firestore:', err);
    }
    const current = await this.getCoupons();
    const updated = current.filter(c => c.couponId !== couponId);
    localStorage.setItem('nexus_db_coupons', JSON.stringify(updated));
  },

  // Fetch Payment Methods (Admin managed with multi-source fallback)
  async getPaymentMethods(): Promise<PaymentMethodConfig[]> {
    const methodsMap = new Map<string, PaymentMethodConfig>();
    DEFAULT_PAYMENT_METHODS.forEach(m => methodsMap.set(m.id, { ...m }));

    // Helper to process raw objects or arrays
    const processItem = (item: any, docId?: string) => {
      if (!item) return;
      if (typeof item === 'string' && docId) {
        // e.g. bkash: "01351625005"
        const existing = methodsMap.get(docId) || DEFAULT_PAYMENT_METHODS.find(m => m.id === docId);
        if (existing) {
          methodsMap.set(docId, { ...existing, accountNumber: item.trim() });
        }
        return;
      }

      const normalized = normalizePaymentMethod(item, docId);
      if (normalized && normalized.accountNumber) {
        const existing = methodsMap.get(normalized.id);
        if (existing) {
          methodsMap.set(normalized.id, {
            ...existing,
            ...normalized,
            accountNumber: normalized.accountNumber || existing.accountNumber,
            accountType: normalized.accountType || existing.accountType,
            instructions: normalized.instructions || existing.instructions
          });
        } else {
          methodsMap.set(normalized.id, normalized);
        }
      }
    };

    // Helper to inspect setting object with keys like bkashNumber, nagadNumber, bkash, nagad etc.
    const processSettingsObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      const keys = Object.keys(obj);
      for (const k of keys) {
        const val = obj[k];
        if (!val) continue;
        const lowerK = k.toLowerCase();

        let targetId = '';
        if (lowerK.includes('bkash')) targetId = 'bkash';
        else if (lowerK.includes('nagad')) targetId = 'nagad';
        else if (lowerK.includes('rocket')) targetId = 'rocket';
        else if (lowerK.includes('upay')) targetId = 'upay';
        else if (lowerK.includes('card') || lowerK.includes('bank')) targetId = 'card';

        if (targetId) {
          if (typeof val === 'string' || typeof val === 'number') {
            const existing = methodsMap.get(targetId);
            if (existing) {
              methodsMap.set(targetId, { ...existing, accountNumber: val.toString().trim() });
            }
          } else if (typeof val === 'object') {
            processItem(val, targetId);
          }
        }
      }
    };

    // 1. Try fetching from Firestore collections
    const collectionsToTry = ['paymentMethods', 'payment_methods', 'gateways'];
    for (const collName of collectionsToTry) {
      try {
        const snap = await getDocs(collection(db, collName));
        if (!snap.empty) {
          snap.docs.forEach(d => {
            const data = d.data();
            processItem(data, d.id);
            processSettingsObject(data);
          });
        }
      } catch (err) {
        // Silently catch permission or missing collection errors
      }
    }

    // 2. Try fetching from Firestore settings documents
    const settingsDocsToTry = [
      ['settings', 'payments'],
      ['settings', 'payment_methods'],
      ['settings', 'paymentMethods'],
      ['settings', 'gateways'],
      ['paymentSettings', 'config'],
      ['payment_settings', 'methods']
    ];
    for (const [coll, docId] of settingsDocsToTry) {
      try {
        const snap = await getDoc(doc(db, coll, docId));
        if (snap.exists()) {
          const data = snap.data();
          processSettingsObject(data);
          if (Array.isArray(data.methods)) {
            data.methods.forEach((m: any) => processItem(m));
          }
        }
      } catch (err) {
        // Silently catch
      }
    }

    // 3. Try checking local storage keys
    const localKeys = [
      'nexus_db_payment_methods',
      'payment_methods',
      'paymentMethods',
      'admin_payment_numbers',
      'payment_settings',
      'mfs_numbers',
      'payment_config'
    ];
    for (const key of localKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach(m => processItem(m));
          } else if (typeof parsed === 'object') {
            processSettingsObject(parsed);
          }
        } catch { /* ignore */ }
      }
    }

    const result = Array.from(methodsMap.values()).filter(m => m.isActive);
    return result.length > 0 ? result : DEFAULT_PAYMENT_METHODS;
  },

  // Save/Update Payment Method (Admin)
  async savePaymentMethod(method: PaymentMethodConfig): Promise<PaymentMethodConfig> {
    try {
      await setDoc(doc(db, 'paymentMethods', method.id), method);
    } catch (err) {
      console.warn('Failed saving payment method to Firestore:', err);
    }
    const current = await this.getPaymentMethods();
    const updated = [method, ...current.filter(m => m.id !== method.id)];
    localStorage.setItem('nexus_db_payment_methods', JSON.stringify(updated));
    return method;
  },

  // Delete Payment Method (Admin)
  async deletePaymentMethod(methodId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'paymentMethods', methodId));
    } catch (err) {
      console.warn('Failed deleting payment method from Firestore:', err);
    }
    const current = await this.getPaymentMethods();
    const updated = current.filter(m => m.id !== methodId);
    localStorage.setItem('nexus_db_payment_methods', JSON.stringify(updated));
  },

  // Fetch Offers
  async getOffers(): Promise<Offer[]> {
    try {
      const snap = await getDocs(collection(db, 'offers'));
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as Offer);
      }
      return MOCK_OFFERS;
    } catch (err) {
      console.warn('Failed to fetch offers from Firestore, returning mock data:', err);
      return MOCK_OFFERS;
    }
  },

  // Fetch Course Benefits
  async getCourseBenefits(): Promise<CourseBenefit[]> {
    try {
      const snap = await getDocs(collection(db, 'courseBenefits'));
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as CourseBenefit);
      }
      return MOCK_BENEFITS;
    } catch (err) {
      console.warn('Failed to fetch benefits from Firestore, returning mock data:', err);
      return MOCK_BENEFITS;
    }
  },

  // Fetch Related Courses based on category
  async getRelatedCourses(category: string, currentCourseId: string): Promise<Course[]> {
    try {
      const q = query(
        collection(db, 'courses'), 
        where('category', '==', category),
        limit(5)
      );
      const snap = await getDocs(q);
      let list: Course[] = [];
      if (!snap.empty) {
        list = snap.docs.map(d => ({ ...d.data(), courseId: d.id } as Course));
      } else {
        list = MOCK_COURSES.map(c => ({
          ...c,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        })) as unknown as Course[];
        list = list.filter(c => c.category === category);
      }
      return list.filter(c => c.courseId !== currentCourseId);
    } catch (err) {
      console.warn(`Failed to fetch related courses, returning fallback:`, err);
      return (MOCK_COURSES.map(c => ({
        ...c,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() }
      })) as unknown as Course[])
        .filter(c => c.category === category && c.courseId !== currentCourseId);
    }
  },

  // Create a full secure purchase ledger entry (Defaults to 'pending' for Admin Approval)
  async recordPurchase(data: {
    userId: string;
    userEmail?: string;
    userPhoneNumber?: string;
    courseId: string;
    courseTitle?: string;
    paymentMethod: string;
    amount: number;
    discount: number;
    coupon: string;
    transactionId?: string;
    status?: 'pending' | 'approved' | 'active' | 'success' | 'rejected' | 'failed';
    walletAmountUsed?: number;
    walletUsed?: number;
    paidAmount?: number;
  }): Promise<{ purchaseId: string; transactionId: string }> {
    const purchaseId = 'pur-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const transactionId = data.transactionId?.trim() || ('TXN-' + Math.random().toString(36).substring(2, 11).toUpperCase());
    const paymentId = 'pay-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const nowISO = new Date().toISOString();
    const status = data.status || 'pending';
    const walletUsedVal = data.walletUsed !== undefined ? data.walletUsed : (data.walletAmountUsed || 0);
    const paidAmountVal = data.paidAmount !== undefined ? data.paidAmount : Math.max(0, data.amount - walletUsedVal);

    const purchaseObj: Purchase = {
      purchaseId,
      userId: data.userId,
      userEmail: data.userEmail || auth.currentUser?.email || 'student@nexus.edu',
      userPhoneNumber: data.userPhoneNumber || '',
      courseId: data.courseId,
      courseTitle: data.courseTitle || 'Nexus Course',
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      discount: data.discount,
      coupon: data.coupon || '',
      status: status,
      transactionId,
      purchaseDate: nowISO,
      walletAmountUsed: walletUsedVal,
      walletUsed: walletUsedVal,
      paidAmount: paidAmountVal
    };

    const paymentObj: PaymentDetails = {
      paymentId,
      userId: data.userId,
      courseId: data.courseId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      transactionId,
      status: status,
      createdAt: nowISO
    };

    const txnObj = {
      transactionId,
      purchaseId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      status: status,
      timestamp: nowISO
    };

    try {
      await setDoc(doc(db, 'purchases', purchaseId), purchaseObj);
      await setDoc(doc(db, 'payments', paymentId), paymentObj);
      await setDoc(doc(db, 'transactions', transactionId), txnObj);

      const courseDocRef = doc(db, 'courses', data.courseId);
      await updateDoc(courseDocRef, {
        students: increment(1),
        updatedAt: serverTimestamp()
      }).catch(async () => {
        await setDoc(courseDocRef, { students: 1 }, { merge: true }).catch(() => {});
      });

      console.log('Successfully written pending purchase to Firestore');
    } catch (err) {
      console.warn('Failed writing transaction to Firestore. Saving locally to localStorage...', err);
    }

    const fallbackPurchases = JSON.parse(localStorage.getItem('nexus_db_purchases') || '[]');
    fallbackPurchases.push(purchaseObj);
    localStorage.setItem('nexus_db_purchases', JSON.stringify(fallbackPurchases));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_purchases_updated'));
    }

    return { purchaseId, transactionId };
  },

  // Get user's purchase records matching userId OR userEmail (case-insensitive)
  async getUserPurchases(userId: string, userEmail?: string): Promise<Purchase[]> {
    const firestorePurchases: Purchase[] = [];
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';

    try {
      if (userId) {
        const qUser = query(collection(db, 'purchases'), where('userId', '==', userId));
        const snapUser = await getDocs(qUser);
        snapUser.docs.forEach(d => firestorePurchases.push(d.data() as Purchase));
      }

      if (cleanEmail) {
        const qEmail = query(collection(db, 'purchases'), where('userEmail', '==', cleanEmail));
        const snapEmail = await getDocs(qEmail);
        snapEmail.docs.forEach(d => firestorePurchases.push(d.data() as Purchase));
      }
    } catch (err) {
      console.warn('Failed querying Firestore purchases:', err);
    }

    const fallbackPurchases: Purchase[] = JSON.parse(localStorage.getItem('nexus_db_purchases') || '[]');
    const userFallback = fallbackPurchases.filter((p: any) => 
      (userId && p.userId === userId) || 
      (cleanEmail && p.userEmail?.toLowerCase() === cleanEmail)
    );

    // Merge unique by purchaseId - FIRESTORE DATA TAKES PRECEDENCE
    const map = new Map<string, Purchase>();
    userFallback.forEach(p => map.set(p.purchaseId, p));
    firestorePurchases.forEach(p => map.set(p.purchaseId, p));

    const merged = Array.from(map.values());

    // Sync updated statuses back into local storage
    if (merged.length > 0) {
      const allLocalPurchases: Purchase[] = JSON.parse(localStorage.getItem('nexus_db_purchases') || '[]');
      const localMap = new Map<string, Purchase>();
      allLocalPurchases.forEach(p => localMap.set(p.purchaseId, p));
      merged.forEach(p => localMap.set(p.purchaseId, p));
      localStorage.setItem('nexus_db_purchases', JSON.stringify(Array.from(localMap.values())));
    }

    return merged;
  },

  // Admin Grant Instant Access (Manual or Batch Enrollment)
  async grantInstantAccess(params: {
    identifiers: string[];
    courseId: string;
    courseTitle?: string;
  }): Promise<{ grantedCount: number; details: string[] }> {
    const { identifiers, courseId, courseTitle } = params;
    const nowISO = new Date().toISOString();
    const details: string[] = [];
    let grantedCount = 0;

    const fallbackPurchases: Purchase[] = JSON.parse(localStorage.getItem('nexus_db_purchases') || '[]');
    const fallbackMyCourses = JSON.parse(localStorage.getItem('nexus_my_courses') || '[]');

    for (const rawInput of identifiers) {
      const cleanInput = rawInput.trim();
      if (!cleanInput) continue;

      const isEmail = cleanInput.includes('@');
      const lowercasedEmail = cleanInput.toLowerCase();
      const targetUserId = cleanInput;

      // Unique purchase/enrollment ID
      const safeIdPart = lowercasedEmail.replace(/[^a-z0-9]/g, '_');
      const purchaseId = `instant_${courseId}_${safeIdPart}`;
      const transactionId = `INSTANT_ACCESS_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const purchaseObj: Purchase = {
        purchaseId,
        userId: targetUserId,
        userEmail: lowercasedEmail,
        userPhoneNumber: '',
        courseId,
        courseTitle: courseTitle || 'Nexus Course',
        paymentMethod: 'INSTANT_GRANT',
        amount: 0,
        discount: 0,
        coupon: 'ADMIN_INSTANT_ACCESS',
        status: 'active',
        transactionId,
        purchaseDate: nowISO
      };

      const myCourseObj = {
        userId: targetUserId,
        userEmail: lowercasedEmail,
        courseId,
        enrollmentDate: nowISO,
        lastOpenedDate: nowISO,
        totalProgress: 0,
        lastLessonId: '',
        isCompleted: false,
        status: 'active'
      };

      // 1. Write or Merge to Firestore
      try {
        await setDoc(doc(db, 'purchases', purchaseId), purchaseObj, { merge: true });
        await setDoc(doc(db, 'myCourses', `${targetUserId}_${courseId}`), myCourseObj, { merge: true });
        if (isEmail && targetUserId !== lowercasedEmail) {
          await setDoc(doc(db, 'myCourses', `${lowercasedEmail}_${courseId}`), myCourseObj, { merge: true });
        }
      } catch (err) {
        console.warn(`Firestore write failed for instant access grant (${cleanInput}):`, err);
      }

      // 2. Update Local Storage Fallbacks
      const pIndex = fallbackPurchases.findIndex(p => p.purchaseId === purchaseId);
      if (pIndex > -1) {
        fallbackPurchases[pIndex] = { ...fallbackPurchases[pIndex], ...purchaseObj, status: 'active' };
      } else {
        fallbackPurchases.push(purchaseObj);
      }

      const mcIndex = fallbackMyCourses.findIndex((m: any) => 
        (m.userId === targetUserId || m.userEmail?.toLowerCase() === lowercasedEmail) && m.courseId === courseId
      );
      if (mcIndex > -1) {
        fallbackMyCourses[mcIndex] = { ...fallbackMyCourses[mcIndex], ...myCourseObj, status: 'active' };
      } else {
        fallbackMyCourses.push(myCourseObj);
      }

      // Sync user specific enrollment arrays in localStorage
      const enrollKeys = [
        `nexus_enrollments_${targetUserId}`,
        `nexus_enrollments_${lowercasedEmail}`,
        'nexus_enrollments'
      ];
      enrollKeys.forEach(key => {
        const currentArr: string[] = JSON.parse(localStorage.getItem(key) || '[]');
        if (!currentArr.includes(courseId)) {
          currentArr.push(courseId);
          localStorage.setItem(key, JSON.stringify(currentArr));
        }
      });

      // Initialize course progress record
      const courseProgressDoc = {
        userId: targetUserId,
        userEmail: lowercasedEmail,
        courseId,
        progressPercent: 0,
        totalLessons: 10,
        completedLessons: 0,
        lastOpenedDate: nowISO
      };
      try {
        await setDoc(doc(db, 'courseProgress', `${targetUserId}_${courseId}`), courseProgressDoc, { merge: true });
        if (isEmail && targetUserId !== lowercasedEmail) {
          await setDoc(doc(db, 'courseProgress', `${lowercasedEmail}_${courseId}`), courseProgressDoc, { merge: true });
        }
      } catch (err) {
        console.warn('Silent progress initialization error:', err);
      }

      grantedCount++;
      details.push(lowercasedEmail);
    }

    localStorage.setItem('nexus_db_purchases', JSON.stringify(fallbackPurchases));
    localStorage.setItem('nexus_my_courses', JSON.stringify(fallbackMyCourses));

    if (grantedCount > 0) {
      try {
        const courseDocRef = doc(db, 'courses', courseId);
        await updateDoc(courseDocRef, {
          students: increment(grantedCount),
          updatedAt: serverTimestamp()
        }).catch(e => console.warn('Silently skipped course student increment:', e));
      } catch (e) {
        console.warn('Failed to update student count on instant access:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_purchases_updated'));
    }

    return { grantedCount, details };
  },

  // Get all purchases for Admin Panel
  async getAllPurchases(): Promise<Purchase[]> {
    let firestorePurchases: Purchase[] = [];
    try {
      const snap = await getDocs(collection(db, 'purchases'));
      if (!snap.empty) {
        firestorePurchases = snap.docs.map(d => d.data() as Purchase);
      }
    } catch (err) {
      console.warn('Failed querying all Firestore purchases:', err);
    }
    const fallbackPurchases: Purchase[] = JSON.parse(localStorage.getItem('nexus_db_purchases') || '[]');
    
    const map = new Map<string, Purchase>();
    fallbackPurchases.forEach(p => map.set(p.purchaseId, p));
    firestorePurchases.forEach(p => map.set(p.purchaseId, p));

    const merged = Array.from(map.values()).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    localStorage.setItem('nexus_db_purchases', JSON.stringify(merged));

    return merged;
  },

  // Admin Approve Purchase
  async approvePurchase(purchaseId: string): Promise<{ userId: string; courseId: string }> {
    let targetPurchase: Purchase | null = null;
    try {
      const pRef = doc(db, 'purchases', purchaseId);
      const snap = await getDoc(pRef);
      if (snap.exists()) {
        targetPurchase = { ...(snap.data() as Purchase), status: 'approved' };
        await updateDoc(pRef, { status: 'approved' });
      }
    } catch (err) {
      console.warn('Failed updating Firestore purchase approval:', err);
    }

    const fallbackPurchases: Purchase[] = JSON.parse(localStorage.getItem('nexus_db_purchases') || '[]');
    let foundInFallback = false;
    const updated = fallbackPurchases.map(p => {
      if (p.purchaseId === purchaseId) {
        foundInFallback = true;
        p.status = 'approved';
        if (!targetPurchase) targetPurchase = p;
      }
      return p;
    });

    if (!foundInFallback && targetPurchase) {
      updated.push(targetPurchase);
    }

    localStorage.setItem('nexus_db_purchases', JSON.stringify(updated));

    if (!targetPurchase) {
      throw new Error('Purchase record not found.');
    }

    const targetEmail = targetPurchase.userEmail ? targetPurchase.userEmail.trim().toLowerCase() : '';
    const nowISO = new Date().toISOString();

    // Deduct wallet balance if combined purchase used wallet amount
    const walletUsed = (targetPurchase as any).walletAmountUsed || 0;
    if (walletUsed > 0) {
      try {
        const uRef = doc(db, 'users', targetPurchase.userId);
        const uSnap = await getDoc(uRef);
        let currentWallet = 0;
        if (uSnap.exists()) {
          currentWallet = uSnap.data().walletBalance || 0;
        } else {
          const allUsers = JSON.parse(localStorage.getItem('nexus_db_users') || '[]');
          const foundU = allUsers.find((u: any) => u.uid === targetPurchase!.userId || u.username === targetPurchase!.userId);
          if (foundU) currentWallet = foundU.walletBalance || 0;
        }

        const newWalletBalance = Math.max(0, currentWallet - walletUsed);
        await updateDoc(uRef, {
          walletBalance: newWalletBalance,
          updatedAt: serverTimestamp()
        }).catch(() => {});

        const allUsers = JSON.parse(localStorage.getItem('nexus_db_users') || '[]');
        const updatedUsers = allUsers.map((u: any) => {
          if (u.uid === targetPurchase!.userId || u.username === targetPurchase!.userId) {
            return { ...u, walletBalance: newWalletBalance };
          }
          return u;
        });
        localStorage.setItem('nexus_db_users', JSON.stringify(updatedUsers));

        await addDoc(collection(db, 'walletTransactions'), {
          userId: targetPurchase.userId,
          type: 'debit',
          category: 'course_purchase',
          amount: walletUsed,
          balanceAfter: newWalletBalance,
          description: `Combined purchase approved (Wallet portion): ${targetPurchase.courseTitle || targetPurchase.courseId}`,
          createdAt: nowISO
        }).catch(() => {});

        const fallbackWalletTx = JSON.parse(localStorage.getItem('nexus_wallet_transactions') || '[]');
        fallbackWalletTx.push({
          userId: targetPurchase.userId,
          type: 'debit',
          category: 'course_purchase',
          amount: walletUsed,
          balanceAfter: newWalletBalance,
          description: `Combined purchase approved (Wallet portion): ${targetPurchase.courseTitle || targetPurchase.courseId}`,
          createdAt: nowISO
        });
        localStorage.setItem('nexus_wallet_transactions', JSON.stringify(fallbackWalletTx));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nexus_wallet_updated', { detail: { newWallet: newWalletBalance } }));
        }
      } catch (err) {
        console.warn('Failed deducting wallet balance on purchase approval:', err);
      }
    }

    // Sync myCourses document in Firestore
    const myCourseObj = {
      userId: targetPurchase.userId,
      userEmail: targetEmail || targetPurchase.userId.toLowerCase(),
      courseId: targetPurchase.courseId,
      enrollmentDate: targetPurchase.purchaseDate || nowISO,
      lastOpenedDate: nowISO,
      totalProgress: 0,
      lastLessonId: '',
      isCompleted: false,
      status: 'active'
    };

    try {
      await setDoc(doc(db, 'myCourses', `${targetPurchase.userId}_${targetPurchase.courseId}`), myCourseObj, { merge: true });
      if (targetEmail && targetEmail !== targetPurchase.userId) {
        await setDoc(doc(db, 'myCourses', `${targetEmail}_${targetPurchase.courseId}`), myCourseObj, { merge: true });
      }

      // Increment real-time enrolled student count on the course document in Firestore
      const courseDocRef = doc(db, 'courses', targetPurchase.courseId);
      await updateDoc(courseDocRef, {
        students: increment(1),
        updatedAt: serverTimestamp()
      }).catch(e => console.warn('Silently skipped course student increment:', e));
    } catch (e) {
      console.warn('Failed saving myCourses relation on purchase approval:', e);
    }

    // Sync localStorage myCourses
    const fallbackMyCourses = JSON.parse(localStorage.getItem('nexus_my_courses') || '[]');
    const mcIndex = fallbackMyCourses.findIndex((m: any) => 
      (m.userId === targetPurchase!.userId || (targetEmail && m.userEmail?.toLowerCase() === targetEmail)) && 
      m.courseId === targetPurchase!.courseId
    );
    if (mcIndex > -1) {
      fallbackMyCourses[mcIndex] = { ...fallbackMyCourses[mcIndex], ...myCourseObj, status: 'active' };
    } else {
      fallbackMyCourses.push(myCourseObj);
    }
    localStorage.setItem('nexus_my_courses', JSON.stringify(fallbackMyCourses));

    // Automatically add to user's enrolled list in localStorage as well
    const enrollKeys = [
      `nexus_enrollments_${targetPurchase.userId}`,
      targetEmail ? `nexus_enrollments_${targetEmail}` : '',
      'nexus_enrollments'
    ].filter(Boolean);

    enrollKeys.forEach(key => {
      const currentEnrolled: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!currentEnrolled.includes(targetPurchase!.courseId)) {
        currentEnrolled.push(targetPurchase!.courseId);
        localStorage.setItem(key, JSON.stringify(currentEnrolled));
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_purchases_updated'));
    }

    return { userId: targetPurchase.userId, courseId: targetPurchase.courseId };
  },

  // Admin Reject Purchase with Automatic Wallet Refund
  async rejectPurchase(purchaseId: string): Promise<void> {
    let targetPurchase: Purchase | null = null;
    try {
      const pRef = doc(db, 'purchases', purchaseId);
      const pSnap = await getDoc(pRef);
      if (pSnap.exists()) {
        targetPurchase = pSnap.data() as Purchase;
      }
      await updateDoc(pRef, { status: 'rejected' });
    } catch (err) {
      console.warn('Failed updating Firestore purchase rejection:', err);
    }

    const fallbackPurchases: Purchase[] = JSON.parse(localStorage.getItem('nexus_db_purchases') || '[]');
    const updated = fallbackPurchases.map(p => {
      if (p.purchaseId === purchaseId) {
        if (!targetPurchase) targetPurchase = p;
        p.status = 'rejected';
      }
      return p;
    });
    localStorage.setItem('nexus_db_purchases', JSON.stringify(updated));

    // Auto refund wallet amount if any wallet balance was used
    const walletUsed = targetPurchase?.walletAmountUsed || targetPurchase?.walletUsed || 0;
    const targetUserId = targetPurchase?.userId;
    if (walletUsed > 0 && targetUserId) {
      try {
        const userDocRef = doc(db, 'users', targetUserId);
        const userSnap = await getDoc(userDocRef);
        let currentBal = 0;
        if (userSnap.exists()) {
          currentBal = Number(userSnap.data().walletBalance || userSnap.data().wallet || 0);
        }
        const newBal = currentBal + walletUsed;

        await updateDoc(userDocRef, {
          walletBalance: newBal,
          updatedAt: serverTimestamp()
        }).catch(async () => {
          await setDoc(userDocRef, { walletBalance: newBal }, { merge: true });
        });

        await addDoc(collection(db, 'walletTransactions'), {
          userId: targetUserId,
          type: 'credit',
          category: 'refund',
          amount: walletUsed,
          balanceAfter: newBal,
          description: `Refund for rejected purchase: ${targetPurchase?.courseTitle || targetPurchase?.courseId || purchaseId}`,
          createdAt: new Date().toISOString()
        }).catch(() => {});

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nexus_wallet_updated', { detail: { newWallet: newBal } }));
        }
      } catch (refundErr) {
        console.error('Failed processing automatic wallet refund on rejection:', refundErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_purchases_updated'));
    }
  },

  // Admin Delete / Revoke Enrollment & Purchase across purchases, myCourses, and enrollments collections
  async deleteEnrollment(params: { userId: string; courseId: string; purchaseId?: string }): Promise<void> {
    const { userId, courseId, purchaseId } = params;
    const cleanUserId = userId?.trim() || '';
    const cleanCourseId = courseId?.trim() || '';

    try {
      if (purchaseId) {
        await deleteDoc(doc(db, 'purchases', purchaseId)).catch(() => {});
      }
      if (cleanUserId && cleanCourseId) {
        await deleteDoc(doc(db, 'myCourses', `${cleanUserId}_${cleanCourseId}`)).catch(() => {});
        await deleteDoc(doc(db, 'enrollments', `${cleanUserId}_${cleanCourseId}`)).catch(() => {});
        if (cleanUserId.includes('@')) {
          const lowerEmail = cleanUserId.toLowerCase();
          await deleteDoc(doc(db, 'myCourses', `${lowerEmail}_${cleanCourseId}`)).catch(() => {});
          await deleteDoc(doc(db, 'enrollments', `${lowerEmail}_${cleanCourseId}`)).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Failed deleting Firestore documents on revoke enrollment:', err);
    }

    const fallbackPurchases: Purchase[] = JSON.parse(localStorage.getItem('nexus_db_purchases') || '[]');
    const filteredPurchases = fallbackPurchases.filter(p => {
      const matchId = purchaseId ? p.purchaseId === purchaseId : false;
      const matchUserCourse = (p.userId === cleanUserId || p.userEmail?.toLowerCase() === cleanUserId.toLowerCase()) && p.courseId === cleanCourseId;
      return !(matchId || matchUserCourse);
    });
    localStorage.setItem('nexus_db_purchases', JSON.stringify(filteredPurchases));

    const fallbackMyCourses = JSON.parse(localStorage.getItem('nexus_my_courses') || '[]');
    const filteredMyCourses = fallbackMyCourses.filter((m: any) => 
      !((m.userId === cleanUserId || m.userEmail?.toLowerCase() === cleanUserId.toLowerCase()) && m.courseId === cleanCourseId)
    );
    localStorage.setItem('nexus_my_courses', JSON.stringify(filteredMyCourses));

    const enrollKeys = [
      `nexus_enrollments_${cleanUserId}`,
      cleanUserId.includes('@') ? `nexus_enrollments_${cleanUserId.toLowerCase()}` : '',
      'nexus_enrollments'
    ].filter(Boolean);

    enrollKeys.forEach(key => {
      const currentArr: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updatedArr = currentArr.filter(id => id !== cleanCourseId);
      localStorage.setItem(key, JSON.stringify(updatedArr));
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_purchases_updated'));
    }
  }
};
