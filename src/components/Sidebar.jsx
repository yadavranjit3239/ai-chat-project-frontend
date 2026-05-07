import React from 'react';

const Sidebar = ({ chats, activeChat, onSelectChat, onNewChat, onDeleteChat }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onNewChat}>
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>
      </div>
      <div className="chat-list">
        {chats.map(chat => (
          <div 
            key={chat._id} 
            className={`chat-item ${activeChat === chat._id ? 'active' : ''}`}
            onClick={() => onSelectChat(chat._id)}
          >
            <div className="chat-item-title">
              {chat.title}
            </div>
            <button 
              className="delete-btn" 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat._id);
              }}
              title="Delete chat"
            >
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
