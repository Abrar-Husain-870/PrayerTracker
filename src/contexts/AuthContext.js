import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userNickname, setUserNickname] = useState('');

  const signup = async (email, password, nickname) => {
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile with nickname
      await updateProfile(user, {
        displayName: nickname
      });
      
      // Create user profile document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        nickname: nickname,
        displayName: nickname,
        createdAt: new Date(),
        authProvider: 'email'
      });
      
      return userCredential;
    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      // If user doesn't exist, create profile with Google display name as nickname
      if (!userDoc.exists()) {
        const nickname = user.displayName || user.email.split('@')[0]; // Fallback to email prefix if no display name
        
        await setDoc(userDocRef, {
          email: user.email,
          nickname: nickname,
          displayName: nickname,
          createdAt: new Date(),
          authProvider: 'google',
          photoURL: user.photoURL || null
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error during Google login:', error);
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  // Get user's nickname from Firestore
  const getUserNickname = async (userId = null) => {
    try {
      const uid = userId || currentUser?.uid;
      if (!uid) return 'User';
      
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const nickname = userDoc.data().nickname || userDoc.data().displayName || 'User';
        setUserNickname(nickname); // Update cached nickname
        return nickname;
      }
      return 'User';
    } catch (error) {
      console.error('Error getting user nickname:', error);
      return 'User';
    }
  };
  
  // Refresh nickname from Firestore (call this after updating nickname)
  const refreshNickname = async () => {
    if (currentUser) {
      await getUserNickname(currentUser.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Load nickname when user signs in
        await getUserNickname(user.uid);
      } else {
        setUserNickname('');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userNickname,
    signup,
    login,
    loginWithGoogle,
    logout,
    getUserNickname,
    refreshNickname
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
