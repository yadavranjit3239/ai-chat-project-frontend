import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatArea = ({ messages, isLoading, input, setInput, handleSend, selectedImage, setSelectedImage }) => {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Audio state
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default to true (Muted)
  const recognitionRef = useRef(null);
  const wasLoading = useRef(false);
  const isPlayingRef = useRef(false);

  // Video state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Microphone initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access was denied. Please allow microphone permissions in your browser.');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [setInput]);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.error('Microphone start error:', e);
          setIsListening(false);
        }
      } else {
        alert("Your browser does not support Speech Recognition. Try Google Chrome.");
      }
    }
  };

  // Webcam functions
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsCameraOpen(true);
      
      // We need to wait for state to update and video element to render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Camera access was denied or no camera found. Please allow camera permissions in your browser.");
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video stream
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw image to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get Base64 image
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Strip out the data:image/jpeg;base64, part for Gemini
      const base64Data = imageDataUrl.split(',')[1];
      const mimeType = imageDataUrl.split(';')[0].split(':')[1];
      
      setSelectedImage({
        dataUrl: imageDataUrl, // Full URL for preview
        data: base64Data,      // Clean base64 for API
        mimeType: mimeType     // e.g. image/jpeg
      });
      
      closeCamera();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const stopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isPlayingRef.current = false;
  };

  const getVoicesAsync = () => {
    return new Promise(resolve => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices);
      };
      // Fallback if event doesn't fire
      setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
    });
  };

  const speakText = async (text) => {
    if (!window.speechSynthesis) return;
    stopAudio(); // Stop any current speech
    isPlayingRef.current = true;
    
    // Strip markdown formatting
    let cleanText = text
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
      .replace(/(\*|_)(.*?)\1/g, '$2') // italics
      .replace(/`{3}[\s\S]*?`{3}/g, ' ') // replace code blocks
      .replace(/`/g, '') // inline code
      .replace(/#/g, ''); // headings
      
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = await getVoicesAsync();

    // Detect if text contains Hindi/Devanagari characters
    const isHindi = /[\u0900-\u097F]/.test(cleanText);

    if (isHindi) {
      utterance.lang = 'hi-IN';
      // Actively search for Chrome's high-quality "Google हिन्दी" neural voice to avoid the robotic Microsoft Hemant voice
      const googleHindi = voices.find(v => v.name.includes('Google') && v.lang.includes('hi'));
      const fallbackHindi = voices.find(v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi'));
      utterance.voice = googleHindi || fallbackHindi;
    } else {
      utterance.lang = 'en-US';
      // Actively search for Chrome's high-quality English neural voices
      const googleEnglish = voices.find(v => v.name.includes('Google') && v.lang.includes('en'));
      const premiumEnglish = voices.find(v => (v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Premium')) && v.lang.includes('en'));
      utterance.voice = googleEnglish || premiumEnglish || voices.find(v => v.lang.includes('en'));
    }

    // Adjust rate and pitch to sound more human-like and natural
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onend = () => { isPlayingRef.current = false; };
    utterance.onerror = () => { isPlayingRef.current = false; };

    window.speechSynthesis.speak(utterance);
  };

  const prevIsMuted = useRef(isMuted);

  useEffect(() => {
    scrollToBottom();
    
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    
    // Trigger speech when a new AI message arrives
    if (wasLoading.current && !isLoading && lastMsg) {
      if (lastMsg.role === 'model' && !isMuted) {
        const textPart = lastMsg.parts.find(p => p.text);
        if (textPart) speakText(textPart.text);
      }
    }
    
    // Trigger speech if user manually unmutes after a message is already there
    if (prevIsMuted.current === true && isMuted === false && lastMsg && !isLoading) {
      if (lastMsg.role === 'model' && !isPlayingRef.current) {
        const textPart = lastMsg.parts.find(p => p.text);
        if (textPart) speakText(textPart.text);
      }
    }

    wasLoading.current = isLoading;
    prevIsMuted.current = isMuted;
  }, [messages, isLoading, isMuted]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Cleanup camera and speech on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      stopAudio();
    };
  }, []);

  return (
    <div className="chat-area">
      <div className="chat-header">
        <h1>ChatGPT 2.0</h1>
      </div>
      
      {/* Camera Modal Overlay */}
      {isCameraOpen && (
        <div className="camera-overlay">
          <div className="camera-modal">
            <div className="camera-header">
              <h3>Take a photo</h3>
              <button className="close-btn" onClick={closeCamera}>×</button>
            </div>
            <video ref={videoRef} autoPlay playsInline className="video-preview" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="camera-controls">
              <button aria-label="Capture Photo" className="capture-btn" onClick={capturePhoto}>Capture</button>
            </div>
          </div>
        </div>
      )}
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <h2>Welcome to ChatGPT 2.0</h2>
            <p>How can I help you today? You can now speak or take photos!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`message-wrapper ${msg.role}`}>
              <div className={`avatar ${msg.role}`}>
                {msg.role === 'user' ? 'U' : 'AI'}
              </div>
              <div className="message-content prose">
                {msg.parts && msg.parts.map((p, i) => (
                  <React.Fragment key={i}>
                    {p.text && msg.role === 'user' && <span>{p.text}</span>}
                    {p.text && msg.role === 'model' && (
                      <ReactMarkdown
                        children={p.text}
                        components={{
                          code({node, inline, className, children, ...props}) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <SyntaxHighlighter
                                {...props}
                                children={String(children).replace(/\n$/, '')}
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                              />
                            ) : (
                              <code {...props} className={className}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      />
                    )}
                    {p.inlineData && (
                      <div className="message-image-container">
                        <img 
                          src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} 
                          alt="User upload" 
                          className="message-image" 
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="message-wrapper model">
            <div className="avatar model">AI</div>
            <div className="message-content">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        {selectedImage && (
          <div className="image-preview-box">
            <img src={selectedImage.dataUrl} alt="Preview" />
            <button className="remove-image-btn" onClick={() => setSelectedImage(null)}>×</button>
          </div>
        )}
        <div className="input-box">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Send a message or photo..."
            rows="1"
          />
          <button
            aria-label="Open Camera"
            className="camera-btn mic-btn"
            onClick={openCamera}
            title="Take Photo"
          >
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="3.2"></circle>
              <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"></path>
            </svg>
          </button>
          <button
            aria-label={isMuted ? "Unmute AI Voice" : "Mute AI Voice"}
            className={`mic-btn ${isMuted ? 'muted' : ''}`}
            onClick={() => {
              if (!isMuted) stopAudio();
              setIsMuted(!isMuted);
            }}
            title={isMuted ? "Unmute AI Voice" : "Mute AI Voice"}
          >
            {isMuted ? (
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
                <path fill="none" d="M0 0h24v24H0z"></path>
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path>
              </svg>
            ) : (
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
                <path fill="none" d="M0 0h24v24H0z"></path>
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path>
              </svg>
            )}
          </button>
          <button
            aria-label="Toggle Voice Input"
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleListen}
            title="Voice Input"
          >
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
              <path fill="none" d="M0 0h24v24H0z"></path>
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"></path>
            </svg>
          </button>
          <button 
            aria-label="Send Message"
            className="send-btn" 
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isLoading}
          >
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
