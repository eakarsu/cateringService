import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Bot, Send, Sparkles, Calculator, UtensilsCrossed, Truck, Users, MessageSquare, Star, FileText, Package, X, Copy, Check, Clock } from 'lucide-react';

const AI_FEATURES = [
  { id: 'quote', label: 'Quote Generator', icon: Calculator, description: 'Generate instant event quotes' },
  { id: 'menu', label: 'Menu Suggester', icon: UtensilsCrossed, description: 'Get menu recommendations' },
  { id: 'dietary', label: 'Dietary Planner', icon: Package, description: 'Accommodate restrictions' },
  { id: 'logistics', label: 'Logistics Optimizer', icon: Truck, description: 'Plan routes & schedules' },
  { id: 'staff', label: 'Staff Matcher', icon: Users, description: 'Assign staff to events' },
  { id: 'followup', label: 'Follow-up Generator', icon: MessageSquare, description: 'Create post-event messages' },
  { id: 'review', label: 'Review Request', icon: Star, description: 'Collect testimonials' },
  { id: 'proposal', label: 'Proposal Writer', icon: FileText, description: 'Generate proposals' },
  { id: 'inventory', label: 'Inventory Calculator', icon: Package, description: 'Scale ingredients' },
  { id: 'timeline', label: 'Timeline Generator', icon: Clock, description: 'Create event checklists' }
];

export default function AIAssistant() {
  const { user } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState('quote');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [eventTypes, setEventTypes] = useState([]);
  const [budgetLevels, setBudgetLevels] = useState([]);
  const [context, setContext] = useState({
    eventType: 'CORPORATE',
    guestCount: 50,
    budget: 'standard'
  });
  const [showPopup, setShowPopup] = useState(false);
  const [popupResponse, setPopupResponse] = useState('');
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [eventTypesRes, budgetLevelsRes] = await Promise.all([
        api.get('/events/options/types'),
        api.get('/events/options/budget-levels')
      ]);
      setEventTypes(eventTypesRes.data);
      setBudgetLevels(budgetLevelsRes.data);
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  };

  useEffect(() => {
    // Add initial AI message when feature changes
    const feature = AI_FEATURES.find(f => f.id === selectedFeature);
    setMessages([{
      role: 'assistant',
      content: getInitialMessage(selectedFeature)
    }]);
  }, [selectedFeature]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getInitialMessage = (feature) => {
    const greetings = {
      quote: "I'm your AI Quote Generator. Tell me about your event - type, guest count, and any special requirements - and I'll create a detailed quote instantly.",
      menu: "I'm your AI Menu Suggester. Describe your event type, guest preferences, and any dietary requirements, and I'll recommend the perfect menu.",
      dietary: "I'm your AI Dietary Planner. Share the dietary restrictions and allergies in your group, and I'll help you accommodate everyone.",
      logistics: "I'm your AI Logistics Optimizer. Tell me about your event location, timing, and setup needs, and I'll create an efficient logistics plan.",
      staff: "I'm your AI Staff Matcher. Share your event details and staffing requirements, and I'll recommend the right team composition.",
      followup: "I'm your AI Follow-up Generator. Provide client and event details, and I'll create a personalized post-event message.",
      review: "I'm your AI Review Request assistant. I'll help you craft the perfect message to request testimonials from satisfied clients.",
      proposal: "I'm your AI Proposal Writer. Give me the event details and I'll generate a professional proposal.",
      inventory: "I'm your AI Inventory Calculator. Tell me your menu and guest count, and I'll calculate the exact ingredients needed.",
      timeline: "I'm your AI Timeline Generator. Tell me about your event type, timing, and requirements, and I'll create a comprehensive checklist and timeline."
    };
    return greetings[feature] || "How can I help you today?";
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        feature: selectedFeature,
        message: userMessage,
        context,
        userId: user?.id
      });

      const aiResponse = res.data.response;
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Handle click on the top feature button - show response in popup
  const handleFeatureButtonClick = async () => {
    if (loading) return;

    setLoading(true);
    setCopied(false);

    // Generate a default prompt based on the feature
    const defaultPrompts = {
      quote: `Generate a detailed quote for a ${context.eventType} event with ${context.guestCount} guests at ${context.budget} budget level.`,
      menu: `Suggest a complete menu for a ${context.eventType} event with ${context.guestCount} guests at ${context.budget} budget level.`,
      dietary: `What dietary accommodations should I plan for a ${context.eventType} event with ${context.guestCount} guests?`,
      logistics: `Create a logistics plan for a ${context.eventType} event with ${context.guestCount} guests.`,
      staff: `What staff do I need for a ${context.eventType} event with ${context.guestCount} guests?`,
      followup: `Generate a follow-up message for a successful ${context.eventType} event.`,
      review: `Create a review request message for a ${context.eventType} event client.`,
      proposal: `Generate a proposal for a ${context.eventType} event with ${context.guestCount} guests at ${context.budget} budget level.`,
      inventory: `Calculate inventory needs for a ${context.eventType} event with ${context.guestCount} guests.`,
      timeline: `Create a detailed timeline and checklist for a ${context.eventType} event with ${context.guestCount} guests, including pre-event prep, event day schedule, and breakdown.`
    };

    const prompt = defaultPrompts[selectedFeature] || `Help me with ${selectedFeature}`;

    try {
      const res = await api.post('/ai/chat', {
        feature: selectedFeature,
        message: prompt,
        context,
        userId: user?.id
      });

      const aiResponse = res.data.response;
      setPopupResponse(aiResponse);
      setShowPopup(true);

      // Also add to chat history
      setMessages(prev => [...prev,
        { role: 'user', content: prompt },
        { role: 'assistant', content: aiResponse }
      ]);
    } catch (error) {
      setPopupResponse('Sorry, I encountered an error. Please try again.');
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(popupResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickAction = async (action) => {
    setInput(action);
    setTimeout(() => handleSend(), 100);
  };

  const quickActions = {
    quote: [
      'Generate quote for 100 guests',
      'Wedding reception pricing',
      'Corporate lunch for 50'
    ],
    menu: [
      'Suggest a wedding menu',
      'Vegetarian-friendly options',
      'Summer cocktail party menu'
    ],
    dietary: [
      'Gluten-free options',
      'Vegan menu alternatives',
      'Allergy-safe desserts'
    ],
    logistics: [
      'Create delivery schedule',
      'Optimize route for 3 events',
      'Equipment checklist'
    ],
    staff: [
      'Staff for 150 guest wedding',
      'Bartenders needed for cocktail hour',
      'Server ratio calculation'
    ],
    followup: [
      'Thank you message template',
      'Feedback request email',
      'Post-event survey'
    ],
    review: [
      'Google review request',
      'Video testimonial ask',
      'Written review template'
    ],
    proposal: [
      'Generate wedding proposal',
      'Corporate event proposal',
      'Budget-friendly proposal'
    ],
    inventory: [
      'Scale recipe for 100',
      'Ingredient shopping list',
      'Par level recommendations'
    ],
    timeline: [
      'Generate wedding timeline',
      'Corporate event checklist',
      'Day-of event schedule',
      'Pre-event prep checklist'
    ]
  };

  const currentFeature = AI_FEATURES.find(f => f.id === selectedFeature);

  return (
    <div className="h-[calc(100vh-10rem)]">
      <div className="flex h-full gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="card h-full">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="text-indigo-600" size={20} />
              AI Features
            </h2>
            <div className="space-y-1">
              {AI_FEATURES.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => setSelectedFeature(feature.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${selectedFeature === feature.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <feature.icon size={18} />
                  <span className="text-sm font-medium">{feature.label}</span>
                </button>
              ))}
            </div>

            {/* Context Settings */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Context</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Event Type</label>
                  <select
                    className="select text-sm mt-1"
                    value={context.eventType}
                    onChange={(e) => setContext({...context, eventType: e.target.value})}
                  >
                    {eventTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Guest Count</label>
                  <input
                    type="number"
                    className="input text-sm mt-1"
                    value={context.guestCount}
                    onChange={(e) => setContext({...context, guestCount: parseInt(e.target.value) || 50})}
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Budget Level</label>
                  <select
                    className="select text-sm mt-1"
                    value={context.budget}
                    onChange={(e) => setContext({...context, budget: e.target.value})}
                  >
                    {budgetLevels.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header - Clickable Feature Button */}
          <div
            className={`card mb-4 cursor-pointer transition-all hover:shadow-lg hover:border-indigo-300 border-2 border-transparent ${loading ? 'opacity-50' : ''}`}
            onClick={handleFeatureButtonClick}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  {currentFeature && <currentFeature.icon className="text-indigo-600" size={24} />}
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900">{currentFeature?.label}</h1>
                  <p className="text-sm text-gray-500">{currentFeature?.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loading ? (
                  <div className="flex items-center gap-2 text-indigo-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                    <span className="text-sm">Generating...</span>
                  </div>
                ) : (
                  <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    <Sparkles size={16} />
                    Generate with AI
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="card flex-1 overflow-y-auto mb-4">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
                  >
                    {msg.role === 'user' ? user?.name?.charAt(0) : <Bot size={18} />}
                  </div>
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Bot size={18} />
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {quickActions[selectedFeature]?.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="card">
            <div className="flex gap-3">
              <input
                type="text"
                className="input flex-1"
                placeholder={`Ask about ${currentFeature?.label.toLowerCase()}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={`btn flex items-center gap-2 ${
                  loading || !input.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                <Send size={18} />
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Response Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
            {/* Popup Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Bot className="text-indigo-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Response</h3>
                  <p className="text-sm text-gray-500">{currentFeature?.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyResponse}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy response"
                >
                  {copied ? <Check className="text-green-600" size={20} /> : <Copy className="text-gray-600" size={20} />}
                </button>
                <button
                  onClick={() => setShowPopup(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="text-gray-600" size={20} />
                </button>
              </div>
            </div>

            {/* Popup Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                {popupResponse}
              </pre>
            </div>

            {/* Popup Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={handleCopyResponse}
                className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => setShowPopup(false)}
                className="btn bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
