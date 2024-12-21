import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, signInWithPopup, GithubAuthProvider, signOut } from "firebase/auth";
import ArticleList from "./pages/ArticleList";
import ArticleDetail from "./pages/ArticleDetail";
import AddArticle from "./pages/AddArticle";
import Navbar from "./components/Navbar";
import { Github } from 'lucide-react';

const App = () => {
  const [user, setUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleGitHubLogin = async () => {
    try {
      const auth = getAuth();
      const provider = new GithubAuthProvider();
      provider.addScope("read:org");

      const result = await signInWithPopup(auth, provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;

      const response = await fetch("https://api.github.com/user/orgs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("GitHub APIへのリクエストが失敗しました");
      }
      
      // テストのために組織制限はなし
      const organizations = await response.json();
      const isInOrganization = organizations.some(
        (org) => org.login === "ganon-test"
      ); 
      if (isInOrganization) {
        setUser(result.user);
      } else {
        setUser(result.user);
        console.log("指定された組織に所属していませんがまぁいいでしょう");
      }

    } catch (error) {
      console.error("GitHubログインエラー:", error);
      setErrorMessage(error.message || "ログインに失敗しました。もう一度試してください。");
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            部活動ブログへようこそ
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            部員専用の記事投稿・共有プラットフォーム
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <button
              onClick={handleGitHubLogin}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <Github className="h-5 w-5 mr-2" />
              GitHubでログイン
            </button>
            
            {errorMessage && (
              <div className="mt-4 text-sm text-red-600 text-center">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<ArticleList />} />
          <Route path="/articles/:id" element={<ArticleDetail />} />
          <Route 
            path="/add-article" 
            element={
              user ? <AddArticle /> : <Navigate to="/" replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;