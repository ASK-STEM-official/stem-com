import React from 'react';
import { Link } from 'react-router-dom';
import { PenLine, BookOpen, LogOut } from 'lucide-react';

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <nav className="bg-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <BookOpen className="h-8 w-8" />
            <span className="font-bold text-xl">Club Blog</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link 
              to="/add-article" 
              className="flex items-center space-x-2 px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              <PenLine className="h-5 w-5" />
              <span>新規投稿</span>
            </Link>
            
            <div className="flex items-center space-x-3">
              <img
                src={user?.photoURL}
                alt={user?.displayName}
                className="h-8 w-8 rounded-full"
              />
              <span className="font-medium">{user?.displayName}</span>
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;