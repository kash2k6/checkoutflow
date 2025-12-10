'use client';

import { useState, useRef } from 'react';
import { 
  Dialog,
  Button,
} from '@whop/react/components';

interface CheckoutCustomizationProps {
  flow: {
    id: string;
    checkout_theme?: 'light' | 'dark' | 'system' | null;
    checkout_customization?: {
      buttonColor?: string;
      buttonTextColor?: string;
      backgroundColor?: string;
      textColor?: string;
      borderColor?: string;
      productImageUrl?: string;
      cardBackgroundColor?: string;
    } | null;
  };
  onClose: () => void;
  onSave: (customization: { checkout_theme: 'light' | 'dark' | 'system', checkout_customization: any }) => void;
}

export default function CheckoutCustomization({
  flow,
  onClose,
  onSave,
}: CheckoutCustomizationProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(flow.checkout_theme || 'system');
  const [custom, setCustom] = useState(flow.checkout_customization || {
    buttonColor: '#0D6B4D',
    buttonTextColor: '#ffffff',
    backgroundColor: '',
    textColor: '',
    borderColor: '',
    productImageUrl: '',
    cardBackgroundColor: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    console.log('CheckoutCustomization handleSave - custom state:', JSON.stringify(custom, null, 2));
    console.log('CheckoutCustomization handleSave - theme:', theme);
    
    // Clean up empty strings - only keep fields with actual values
    const cleanedCustom: any = {};
    if (custom.buttonColor && custom.buttonColor.trim()) cleanedCustom.buttonColor = custom.buttonColor;
    if (custom.buttonTextColor && custom.buttonTextColor.trim()) cleanedCustom.buttonTextColor = custom.buttonTextColor;
    if (custom.backgroundColor && custom.backgroundColor.trim()) cleanedCustom.backgroundColor = custom.backgroundColor;
    if (custom.textColor && custom.textColor.trim()) cleanedCustom.textColor = custom.textColor;
    if (custom.borderColor && custom.borderColor.trim()) cleanedCustom.borderColor = custom.borderColor;
    if (custom.productImageUrl && custom.productImageUrl.trim()) cleanedCustom.productImageUrl = custom.productImageUrl;
    if (custom.cardBackgroundColor && custom.cardBackgroundColor.trim()) cleanedCustom.cardBackgroundColor = custom.cardBackgroundColor;
    
    const customizationData = {
      checkout_theme: theme,
      checkout_customization: cleanedCustom,
    };
    
    console.log('CheckoutCustomization handleSave - cleaned custom:', JSON.stringify(cleanedCustom, null, 2));
    console.log('CheckoutCustomization handleSave - sending:', JSON.stringify(customizationData, null, 2));
    
    onSave(customizationData);
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to upload image');
        return;
      }

      const data = await response.json();
      console.log('Image uploaded successfully, URL:', data.url);
      setCustom((prev) => {
        const updated = { ...prev, productImageUrl: data.url };
        console.log('Updated custom state:', JSON.stringify(updated, null, 2));
        return updated;
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content 
        size="3" 
        className="max-w-[calc(100vw-2rem)] md:max-w-[80rem] max-h-[95vh] mx-4 md:mx-auto"
      >
        <Dialog.Title className="text-base md:text-lg">Customize Checkout Page</Dialog.Title>
        <Dialog.Description className="text-sm md:text-base">Configure the appearance and theme of your checkout page</Dialog.Description>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8" style={{ marginTop: 'var(--space-4)' }}>
          {/* Form Section */}
          <div className="space-y-4 md:space-y-6 overflow-y-auto max-h-[calc(95vh-200px)] pr-0 md:pr-2">
            <h3 className="text-base md:text-lg font-semibold text-gray-12 mb-3 md:mb-4">Configuration</h3>
            
            {/* Theme Selection */}
            <div>
              <label className="block text-gray-12 font-semibold mb-2 text-xs md:text-sm">Checkout Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-3 md:px-4 py-2.5 md:py-2 text-gray-12 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 min-h-[44px]"
              >
                <option value="system">System (Follows user's device preference)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <p className="text-gray-10 text-xs mt-1">
                Controls the theme of the Whop checkout embed. "System" will automatically match the user's device preference.
              </p>
            </div>

            {/* Button Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-xs md:text-sm">Button Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={custom.buttonColor || '#0D6B4D'}
                    onChange={(e) => setCustom({ ...custom, buttonColor: e.target.value })}
                    className="w-16 md:w-20 h-10 md:h-12 rounded cursor-pointer border-2 border-gray-a4 hover:border-gray-a5 transition-colors min-h-[44px]"
                  />
                  <input
                    type="text"
                    value={custom.buttonColor || '#0D6B4D'}
                    onChange={(e) => setCustom({ ...custom, buttonColor: e.target.value })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-3 md:px-4 py-2.5 md:py-2 text-gray-12 text-base md:text-sm min-h-[44px]"
                    placeholder="#0D6B4D"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-xs md:text-sm">Button Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={custom.buttonTextColor || '#ffffff'}
                    onChange={(e) => setCustom({ ...custom, buttonTextColor: e.target.value })}
                    className="w-16 md:w-20 h-10 md:h-12 rounded cursor-pointer border-2 border-gray-a4 hover:border-gray-a5 transition-colors min-h-[44px]"
                  />
                  <input
                    type="text"
                    value={custom.buttonTextColor || '#ffffff'}
                    onChange={(e) => setCustom({ ...custom, buttonTextColor: e.target.value })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-3 md:px-4 py-2.5 md:py-2 text-gray-12 text-base md:text-sm min-h-[44px]"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            {/* Background Colors (Optional - for page wrapper) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Background Color (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={custom.backgroundColor || ''}
                    onChange={(e) => setCustom({ ...custom, backgroundColor: e.target.value })}
                    className="w-16 md:w-20 h-10 md:h-12 rounded cursor-pointer border-2 border-gray-a4 hover:border-gray-a5 transition-colors min-h-[44px]"
                  />
                  <input
                    type="text"
                    value={custom.backgroundColor || ''}
                    onChange={(e) => setCustom({ ...custom, backgroundColor: e.target.value })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-3 md:px-4 py-2.5 md:py-2 text-gray-12 text-base md:text-sm min-h-[44px]"
                    placeholder="Leave empty for theme default"
                  />
                </div>
                <p className="text-gray-10 text-xs mt-1">
                  Custom background color for the checkout page wrapper. Leave empty to use theme default.
                </p>
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Text Color (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={custom.textColor || ''}
                    onChange={(e) => setCustom({ ...custom, textColor: e.target.value })}
                    className="w-16 md:w-20 h-10 md:h-12 rounded cursor-pointer border-2 border-gray-a4 hover:border-gray-a5 transition-colors min-h-[44px]"
                  />
                  <input
                    type="text"
                    value={custom.textColor || ''}
                    onChange={(e) => setCustom({ ...custom, textColor: e.target.value })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-3 md:px-4 py-2.5 md:py-2 text-gray-12 text-base md:text-sm min-h-[44px]"
                    placeholder="Leave empty for theme default"
                  />
                </div>
                <p className="text-gray-10 text-xs mt-1">
                  Custom text color for the checkout page. Leave empty to use theme default.
                </p>
              </div>
            </div>

            {/* Card Background Color */}
            <div className="mt-6">
              <label className="block text-gray-12 font-semibold mb-2 text-sm">Product Card Background Color (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={custom.cardBackgroundColor || (theme === 'dark' ? '#2a2a2a' : '#ffffff')}
                  onChange={(e) => setCustom({ ...custom, cardBackgroundColor: e.target.value })}
                  className="w-20 h-12 rounded cursor-pointer border-2 border-gray-a4 hover:border-gray-a5 transition-colors"
                />
                <input
                  type="text"
                  value={custom.cardBackgroundColor || ''}
                  onChange={(e) => setCustom({ ...custom, cardBackgroundColor: e.target.value })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-3 md:px-4 py-2.5 md:py-2 text-gray-12 text-base md:text-sm min-h-[44px]"
                  placeholder="Leave empty for theme default"
                />
              </div>
              <p className="text-gray-10 text-xs mt-1">
                Background color for the product information card. Leave empty to use theme default.
              </p>
            </div>

            {/* Product Image */}
            <div className="mt-6">
              <label className="block text-gray-12 font-semibold mb-2 text-sm">Product Image</label>
              
              {/* File Upload */}
              <div className="mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                  id="product-image-upload"
                />
                <label
                  htmlFor="product-image-upload"
                  className={`inline-flex items-center justify-center px-4 py-2 border border-gray-a4 rounded-lg cursor-pointer transition-colors ${
                    isUploading
                      ? 'bg-gray-a3 text-gray-9 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-a3 text-gray-12 hover:bg-gray-a2 dark:hover:bg-gray-a4'
                  }`}
                >
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </label>
                <span className="ml-2 text-gray-10 text-xs">(Max 5MB, JPEG/PNG/WebP/GIF)</span>
              </div>

              {/* URL Input (Alternative) */}
              <div className="mb-2">
                <label className="block text-gray-10 text-xs mb-1">Or enter image URL:</label>
                <input
                  type="url"
                  value={custom.productImageUrl || ''}
                  onChange={(e) => setCustom({ ...custom, productImageUrl: e.target.value })}
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 text-sm"
                  placeholder="https://example.com/product-image.jpg"
                />
              </div>

              {/* Preview */}
              {custom.productImageUrl && (
                <div className="mt-3">
                  <img 
                    src={custom.productImageUrl} 
                    alt="Product preview" 
                    className="max-w-full h-32 object-contain rounded-lg border border-gray-a4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setCustom({ ...custom, productImageUrl: '' })}
                    className="mt-2 text-sm text-red-500 hover:text-red-600"
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-4 sticky top-4 self-start">
            <h3 className="text-lg font-semibold text-gray-12 mb-4">Live Preview</h3>
            <div className="bg-gray-a1 dark:bg-gray-a2 border border-gray-a4 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto">
              <div 
                className="w-full mx-auto p-8"
                style={{ 
                  backgroundColor: custom.backgroundColor || (theme === 'dark' ? '#1a1a1a' : theme === 'light' ? '#ffffff' : 'transparent'),
                  color: custom.textColor || (theme === 'dark' ? '#ffffff' : theme === 'light' ? '#000000' : 'inherit')
                }}
              >
                <div className="mb-6">
                  {custom.productImageUrl && (
                    <div className="mb-4 flex justify-center">
                      <img 
                        src={custom.productImageUrl} 
                        alt="Product" 
                        className="max-w-full h-32 object-contain rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <h2 className="text-xl font-semibold mb-2" style={{ color: custom.textColor || (theme === 'dark' ? '#ffffff' : '#000000') }}>
                    Product Name
                  </h2>
                  <p className="text-sm font-semibold" style={{ color: custom.buttonColor || '#0D6B4D' }}>
                    $99.99 USD
                  </p>
                </div>

                {/* Preview Checkout Embed Area */}
                <div className="bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg p-6 mb-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-10 mb-1">Email</label>
                      <div className="h-10 bg-gray-a1 dark:bg-gray-a2 border border-gray-a4 rounded px-3 flex items-center">
                        <span className="text-xs text-gray-9">john@example.com</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-10 mb-1">Card Number</label>
                      <div className="h-10 bg-gray-a1 dark:bg-gray-a2 border border-gray-a4 rounded px-3 flex items-center">
                        <span className="text-xs text-gray-9">1234 1234 1234 1234</span>
                      </div>
                    </div>
                    <button
                      className="w-full py-3 px-4 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: custom.buttonColor || '#0D6B4D',
                        color: custom.buttonTextColor || '#ffffff'
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-10 text-center">
                  Note: The actual Whop checkout embed will use the theme you select. Button colors shown here are for reference.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end" style={{ marginTop: 'var(--space-4)' }}>
          <Button color="gray" variant="soft" onClick={onClose} className="w-full sm:w-auto min-h-[44px] touch-manipulation">Cancel</Button>
          <Button color="tomato" variant="classic" onClick={handleSave} className="w-full sm:w-auto min-h-[44px] touch-manipulation">Save Customization</Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

