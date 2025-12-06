'use client';

import { useState, useEffect } from 'react';

interface ConfirmationCustomizationProps {
  flow: {
    id: string;
    confirmation_customization?: {
      primaryColor?: string;
      headerGradientStart?: string;
      headerGradientEnd?: string;
      headerTextColor?: string;
      backgroundColor?: string;
      cardBackgroundColor?: string;
      textColor?: string;
      secondaryButtonColor?: string;
      headerTitle?: string;
      headerSubtitle?: string;
      headerEmoji?: string;
      messageText?: string;
    } | null;
  };
  onClose: () => void;
  onSave: (customization: any) => void;
}

export default function ConfirmationCustomization({
  flow,
  onClose,
  onSave,
}: ConfirmationCustomizationProps) {
  const [custom, setCustom] = useState(flow.confirmation_customization || {
    primaryColor: '#0D6B4D',
    headerGradientStart: '#0D6B4D',
    headerGradientEnd: '#0b5940',
    headerTextColor: '#ffffff',
    backgroundColor: '#1a1a1a',
    cardBackgroundColor: '#2a2a2a',
    textColor: '#ffffff',
    secondaryButtonColor: '#3a3a3a',
    headerTitle: '',
    headerSubtitle: '',
    headerEmoji: '✅',
    messageText: '',
  });

  const handleSave = () => {
    onSave(custom);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-a1/80 dark:bg-gray-a1/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-a2 border border-gray-a4 rounded-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col shadow-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-a4">
          <h2 className="text-2xl font-bold text-gray-12">Customize Confirmation Page</h2>
          <button
            onClick={onClose}
            className="text-gray-10 hover:text-gray-12 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-12 mb-4">Configuration</h3>
            
            {/* Colors */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={custom.primaryColor || '#0D6B4D'}
                    onChange={(e) => setCustom({ 
                      ...custom, 
                      primaryColor: e.target.value, 
                      headerGradientStart: custom.headerGradientStart || e.target.value 
                    })}
                    className="w-20 h-12 rounded cursor-pointer border-2 border-gray-a4 hover:border-gray-a5 transition-colors"
                  />
                  <input
                    type="text"
                    value={custom.primaryColor || '#0D6B4D'}
                    onChange={(e) => setCustom({ 
                      ...custom, 
                      primaryColor: e.target.value, 
                      headerGradientStart: custom.headerGradientStart || e.target.value 
                    })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 text-sm"
                    placeholder="#0D6B4D"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Header Gradient Start</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={custom.headerGradientStart || custom.primaryColor || '#0D6B4D'}
                    onChange={(e) => setCustom({ ...custom, headerGradientStart: e.target.value })}
                    className="w-20 h-12 rounded cursor-pointer border-2 border-gray-a4 hover:border-gray-a5 transition-colors"
                  />
                  <input
                    type="text"
                    value={custom.headerGradientStart || custom.primaryColor || '#0D6B4D'}
                    onChange={(e) => setCustom({ ...custom, headerGradientStart: e.target.value })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 text-sm"
                    placeholder="#0D6B4D"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Header Gradient End</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={custom.headerGradientEnd || '#0b5940'}
                    onChange={(e) => setCustom({ ...custom, headerGradientEnd: e.target.value })}
                    className="w-20 h-12 rounded cursor-pointer border-2 border-gray-a4 hover:border-gray-a5 transition-colors"
                  />
                  <input
                    type="text"
                    value={custom.headerGradientEnd || '#0b5940'}
                    onChange={(e) => setCustom({ ...custom, headerGradientEnd: e.target.value })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 text-sm"
                    placeholder="#0b5940"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Header Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={custom.headerTextColor || '#ffffff'}
                    onChange={(e) => setCustom({ ...custom, headerTextColor: e.target.value })}
                    className="w-20 h-12 rounded cursor-pointer border-2 border-gray-a4 hover:border-gray-a5 transition-colors"
                  />
                  <input
                    type="text"
                    value={custom.headerTextColor || '#ffffff'}
                    onChange={(e) => setCustom({ ...custom, headerTextColor: e.target.value })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 text-sm"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Card Background</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={custom.cardBackgroundColor || '#2a2a2a'}
                    onChange={(e) => setCustom({ ...custom, cardBackgroundColor: e.target.value })}
                    className="w-20 h-12 rounded cursor-pointer border-2 border-gray-a4 hover:border-gray-a5 transition-colors"
                  />
                  <input
                    type="text"
                    value={custom.cardBackgroundColor || '#2a2a2a'}
                    onChange={(e) => setCustom({ ...custom, cardBackgroundColor: e.target.value })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 text-sm"
                    placeholder="#2a2a2a"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Secondary Button Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={custom.secondaryButtonColor || '#3a3a3a'}
                    onChange={(e) => setCustom({ ...custom, secondaryButtonColor: e.target.value })}
                    className="w-20 h-12 rounded cursor-pointer border-2 border-gray-a4 hover:border-gray-a5 transition-colors"
                  />
                  <input
                    type="text"
                    value={custom.secondaryButtonColor || '#3a3a3a'}
                    onChange={(e) => setCustom({ ...custom, secondaryButtonColor: e.target.value })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 text-sm"
                    placeholder="#3a3a3a"
                  />
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Header Title (leave empty for default)</label>
                <input
                  type="text"
                  value={custom.headerTitle || ''}
                  onChange={(e) => setCustom({ ...custom, headerTitle: e.target.value })}
                  placeholder="e.g., ✅ Order Complete!"
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 placeholder:text-gray-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Header Subtitle</label>
                <input
                  type="text"
                  value={custom.headerSubtitle || ''}
                  onChange={(e) => setCustom({ ...custom, headerSubtitle: e.target.value })}
                  placeholder="e.g., Thank you for your purchase"
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 placeholder:text-gray-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Header Emoji</label>
                <input
                  type="text"
                  value={custom.headerEmoji || '✅'}
                  onChange={(e) => setCustom({ ...custom, headerEmoji: e.target.value })}
                  placeholder="✅"
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 placeholder:text-gray-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Message Text (leave empty for default)</label>
                <textarea
                  value={custom.messageText || ''}
                  onChange={(e) => setCustom({ ...custom, messageText: e.target.value })}
                  placeholder="All products have been added to your account. Check your email for confirmation details."
                  rows={3}
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 placeholder:text-gray-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-12 mb-4">Live Preview</h3>
            <div className="bg-gray-a1 dark:bg-gray-a2 border border-gray-a4 rounded-xl overflow-hidden">
              <div className="w-full mx-auto" style={{ backgroundColor: custom.backgroundColor || '#1a1a1a' }}>
                {/* Preview Header */}
                <div 
                  className="p-10 text-center"
                  style={{
                    background: `linear-gradient(to right, ${custom.headerGradientStart || custom.primaryColor || '#0D6B4D'}, ${custom.headerGradientEnd || '#0b5940'})`
                  }}
                >
                  <h1 
                    className="text-4xl font-bold mb-3"
                    style={{ color: custom.headerTextColor || '#ffffff' }}
                  >
                    {custom.headerTitle || `${custom.headerEmoji || '✅'} Order Complete!`}
                  </h1>
                  <p 
                    className="text-lg"
                    style={{ color: custom.headerTextColor ? `${custom.headerTextColor}CC` : 'rgba(255, 255, 255, 0.9)' }}
                  >
                    {custom.headerSubtitle || 'Thank you for your purchase'}
                  </p>
                </div>

                {/* Preview Content */}
                <div className="p-12" style={{ backgroundColor: custom.cardBackgroundColor || '#2a2a2a' }}>
                  <h2 className="text-2xl font-semibold mb-8" style={{ color: custom.textColor || '#ffffff' }}>
                    Your Purchases:
                  </h2>
                  
                  <div className="space-y-4 mb-8">
                    <div className="bg-gray-a1 dark:bg-gray-a3 border border-gray-a4 rounded-lg p-6 flex justify-between items-center">
                      <div>
                        <h3 className="text-gray-12 font-semibold text-lg">Sample Product</h3>
                        <p className="text-gray-10 text-sm mt-1">One-time Purchase</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-12 font-bold text-xl">$99.99</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-a4 pt-6 mb-8">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-semibold" style={{ color: custom.textColor || '#ffffff' }}>Total:</span>
                      <span className="text-3xl font-bold" style={{ color: custom.primaryColor || '#0D6B4D' }}>$99.99</span>
                    </div>
                  </div>

                  <div 
                    className="border rounded-lg p-6 mb-6"
                    style={{
                      backgroundColor: `${custom.primaryColor || '#0D6B4D'}20`,
                      borderColor: `${custom.primaryColor || '#0D6B4D'}40`
                    }}
                  >
                    <p className="text-base" style={{ color: custom.primaryColor || '#0D6B4D' }}>
                      {custom.messageText || 'All products have been added to your account. Check your email for confirmation details.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-6 border-t border-gray-a4">
          <button
            onClick={handleSave}
            className="flex-1 bg-accent-500 hover:bg-accent-600 text-gray-12 font-semibold py-3 rounded-lg"
          >
            Save Customization
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-a3 hover:bg-gray-a4 text-gray-12 font-semibold py-3 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

