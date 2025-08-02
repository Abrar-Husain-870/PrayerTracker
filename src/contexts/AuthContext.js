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
  const getUserNickname = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        return userDoc.data().nickname || userDoc.data().displayName || 'User';
      }
      return 'User';
    } catch (error) {
      console.error('Error getting user nickname:', error);
      return 'User';
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    getUserNickname
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
