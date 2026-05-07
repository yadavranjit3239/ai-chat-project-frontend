import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

// ✅ IMPORTANT: backend URL from .env
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/chat';

function ChatApp() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchChatDetails(activeChat);
    } else {
      setMessages([]);
    }
  }, [activeChat]);

  const fetchChats = async () => {
    try {
      const res = await axios.get(API_URL);
      setChats(res.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    }
  };

  const fetchChatDetails = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/${id}`);
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error('Error fetching chat details:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await axios.post(API_URL);
      setChats([res.data, ...chats]);
      setActiveChat(res.data._id);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleDeleteChat = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      setChats(chats.filter(c => c._id !== id));
      if (activeChat === id) setActiveChat(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    let currentChatId = activeChat;

    if (!currentChatId) {
      try {
        const res = await axios.post(API_URL);
        currentChatId = res.data._id;
        setChats([res.data, ...chats]);
        setActiveChat(currentChatId);
      } catch (error) {
        console.error('Error creating new chat:', error);
        return;
      }
    }

    const userMessage = { role: 'user', parts: [] };

    if (input.trim()) userMessage.parts.push({ text: input });

    if (selectedImage) {
      userMessage.parts.push({
        inlineData: {
          mimeType: selectedImage.mimeType,
          data: selectedImage.data
        }
      });
    }

    setMessages([...messages, userMessage]);
    const currentInput = input;
    const currentImage = selectedImage;

    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const payload = { message: currentInput };
      if (currentImage) payload.image = currentImage;

      const res = await axios.post(`${API_URL}/${currentChatId}/message`, payload);

      setMessages(res.data.chat.messages);
      fetchChats();

    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        "Server error or API limit reached";

      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          parts: [{ text: `⚠️ Error: ${errorMessage}` }]
        }
      ]);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        chats={chats}
        activeChat={activeChat}
        onSelectChat={setActiveChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#343541',
          borderBottom: '1px solid #565869'
        }}>
          <span style={{ marginRight: '15px', color: '#ececf1' }}>
            {user?.email}
          </span>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{
              background: 'transparent',
              border: '1px solid #565869',
              color: '#ececf1',
              padding: '5px 10px',
              borderRadius: '4px'
            }}
          >
            Log out
          </button>
        </div>

        <ChatArea
          messages={messages}
          isLoading={isLoading}
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
        />
      </div>
    </div>
  );
}

export default ChatApp;