'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, Button } from '@whop/react/components';
import { Accordion } from './Accordion';

interface FlowNode {
  id?: string;
  node_type: 'upsell' | 'downsell' | 'cross_sell';
  plan_id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  original_price: number | null;
  redirect_url: string;
  order_index: number;
  facebook_pixel_id?: string | null;
  customization?: {
    // Colors
    primaryColor?: string;
    headerGradientStart?: string;
    headerGradientEnd?: string;
    headerTextColor?: string;
    backgroundColor?: string;
    cardBackgroundColor?: string;
    textColor?: string;
    buttonTextColor?: string;
    secondaryButtonColor?: string;
    // Text Content
    headerTitle?: string;
    headerSubtitle?: string;
    acceptButtonText?: string;
    declineButtonText?: string;
    trustBadgeText?: string;
    priceLabel?: string;
    originalPriceLabel?: string;
    savingsText?: string;
    // Styling
    buttonStyle?: 'rounded' | 'square' | 'pill';
    headerEmoji?: string;
    productImageUrl?: string;
  } | null;
}

interface WhopPlan {
  id: string;
  title: string;
  initial_price: number;
  currency: string;
}

interface NodeEditorProps {
  companyId: string;
  flowId: string;
  node: FlowNode | null;
  nodeType: 'upsell' | 'downsell' | 'cross_sell';
  plans: WhopPlan[];
  onClose: () => void;
  onSave: () => void;
}

export default function NodeEditor({
  companyId,
  flowId,
  node,
  nodeType,
  plans,
  onClose,
  onSave,
}: NodeEditorProps) {
  const [formData, setFormData] = useState<Partial<FlowNode>>({
    plan_id: node?.plan_id || '',
    title: node?.title || '',
    description: node?.description || '',
    price: node?.price || null,
    original_price: node?.original_price || null,
    redirect_url: node?.redirect_url || '',
    order_index: node?.order_index || 0,
    facebook_pixel_id: node?.facebook_pixel_id || '',
    customization: node?.customization || {
      primaryColor: '#0D6B4D',
      headerGradientStart: '#0D6B4D',
      headerGradientEnd: '#0b5940',
      headerTextColor: '#ffffff',
      backgroundColor: '#1a1a1a',
      cardBackgroundColor: '#2a2a2a',
      textColor: '#ffffff',
      buttonTextColor: '#ffffff',
      secondaryButtonColor: '#3a3a3a',
      headerTitle: '',
      headerSubtitle: '',
      acceptButtonText: '',
      declineButtonText: 'No Thanks',
      trustBadgeText: '🔒 Secure one-click checkout • No need to enter payment details again',
      priceLabel: 'One-time Price',
      originalPriceLabel: 'Regular Price',
      savingsText: '',
      buttonStyle: 'pill',
      headerEmoji: '',
      productImageUrl: '',
    },
  });

  const selectedPlan = plans.find(p => p.id === formData.plan_id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (selectedPlan && !formData.price) {
      setFormData(prev => ({
        ...prev,
        price: selectedPlan.initial_price,
        original_price: selectedPlan.initial_price,
      }));
    }
  }, [selectedPlan, formData.price]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload JPEG, PNG, WebP, or GIF images.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', companyId);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          customization: {
            ...prev.customization,
            productImageUrl: data.url || data.imageUrl,
          }
        }));
      } else {
        const error = await response.json();
        alert(`Error uploading image: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plan_id || !formData.redirect_url) {
      alert('Please fill in all required fields: Product Plan and Redirect URL');
      return;
    }

    if (!flowId) {
      alert('Error: Flow ID is missing. Please save the flow first.');
      return;
    }

    try {
      console.log('Saving node:', { flowId, nodeType, formData });
      
      const url = node?.id
        ? `/api/flows/${companyId}/nodes/${node.id}`
        : `/api/flows/${companyId}/nodes`;

      const response = await fetch(url, {
        method: node?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow_id: flowId,
          node_type: nodeType,
          plan_id: formData.plan_id,
          title: formData.title || null,
          description: formData.description || null,
          price: formData.price || null,
          original_price: formData.original_price || null,
          redirect_url: formData.redirect_url,
          order_index: formData.order_index || 0,
          facebook_pixel_id: formData.facebook_pixel_id || null,
          customization: formData.customization || {},
        }),
      });

      const responseData = await response.json();
      console.log('Node save response:', { status: response.status, data: responseData });

      if (response.ok) {
        console.log('Node saved successfully');
        onSave();
      } else {
        console.error('Error saving node:', responseData);
        alert(`Error saving node: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving node:', error);
      alert(`Error saving node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const savings = formData.original_price && formData.price
    ? formData.original_price - formData.price
    : 0;

  const custom = formData.customization || {};
  const getHeaderTitle = () => {
    if (custom.headerTitle) return custom.headerTitle;
    const emoji = custom.headerEmoji || (nodeType === 'upsell' ? '🎉' : nodeType === 'downsell' ? '🎁' : '💎');
    return `${emoji} ${nodeType === 'upsell' ? 'Thank You For Your Purchase!' : nodeType === 'downsell' ? 'Special Offer Just For You!' : 'Exclusive Offer!'}`;
  };
  const getHeaderSubtitle = () => {
    if (custom.headerSubtitle) return custom.headerSubtitle;
    return nodeType === 'upsell' ? 'Wait! Before you go, we have an exclusive offer...' :
           nodeType === 'downsell' ? 'We have one more exclusive offer...' :
           'Don\'t miss out on this opportunity...';
  };
  const getAcceptButtonText = () => {
    if (custom.acceptButtonText) return custom.acceptButtonText;
    return `Yes! Add to My Order - $${(formData.price || 0).toFixed(2)}`;
  };
  const getButtonStyle = () => {
    switch (custom.buttonStyle) {
      case 'square': return 'rounded-none';
      case 'rounded': return 'rounded-lg';
      case 'pill':
      default: return 'rounded-full';
    }
  };

  const previewData = {
    node_type: nodeType,
    title: formData.title || 'Special Offer',
    description: formData.description || 'Get this amazing product at a special price!',
    price: formData.price || 0,
    original_price: formData.original_price || null,
    savings: savings,
    planName: selectedPlan?.title || 'Selected Product',
    custom: custom,
  };

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content 
        size="3" 
        style={{ maxWidth: '80rem', maxHeight: '95vh' }}
      >
        <Dialog.Title>
          {node ? 'Edit' : 'Add'} {nodeType === 'upsell' ? 'Upsell' : nodeType === 'downsell' ? 'Downsell' : 'Cross-sell'}
        </Dialog.Title>
        <Dialog.Description>
          Configure the {nodeType === 'upsell' ? 'upsell' : nodeType === 'downsell' ? 'downsell' : 'cross-sell'} offer details
        </Dialog.Description>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginTop: 'var(--space-4)' }}>
          {/* Form Section */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-2">
          <Accordion title="Basic Information">
            <div className="space-y-4">
              {/* Product Selection */}
              <div>
                <label className="block text-gray-12 font-semibold mb-2">
                  Product Plan <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.plan_id}
                  onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                  required
                >
                  <option value="">Select a product...</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title} - ${plan.initial_price} {plan.currency.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-gray-12 font-semibold mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Never Run Out - Subscribe & Save!"
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-12 font-semibold mb-2">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Get this product delivered monthly. Cancel anytime. Save 15% with subscription!"
                  rows={3}
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-gray-12 font-semibold mb-2">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || null })}
                  placeholder={selectedPlan ? `Default: $${selectedPlan.initial_price}` : 'Enter price'}
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                />
              </div>

              {/* Original Price */}
              <div>
                <label className="block text-gray-12 font-semibold mb-2">Original Price (for showing savings)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.original_price || ''}
                  onChange={(e) => setFormData({ ...formData, original_price: parseFloat(e.target.value) || null })}
                  placeholder="Enter original price to show savings"
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                />
              </div>

              {/* Redirect URL */}
              <div>
                <label className="block text-gray-12 font-semibold mb-2">
                  Redirect URL (where this page is hosted) <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={formData.redirect_url}
                  onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                  placeholder="https://yourdomain.com/upsell"
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                  required
                />
                <p className="text-gray-400 text-sm mt-1">
                  This is the URL where your {nodeType} page will be embedded. Users will be redirected here.
                </p>
              </div>

              {/* Order Index */}
              <div>
                <label className="block text-gray-12 font-semibold mb-2">Order (display order within same type)</label>
                <input
                  type="number"
                  value={formData.order_index || 0}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                />
              </div>
            </div>
          </Accordion>

          <Accordion title="Colors">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.customization?.primaryColor || '#0D6B4D'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: {
                        ...formData.customization,
                        primaryColor: e.target.value,
                        headerGradientStart: formData.customization?.headerGradientStart || e.target.value,
                      }
                    })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.customization?.primaryColor || '#0D6B4D'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: {
                        ...formData.customization,
                        primaryColor: e.target.value,
                        headerGradientStart: formData.customization?.headerGradientStart || e.target.value,
                      }
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
                    value={formData.customization?.headerGradientStart || formData.customization?.primaryColor || '#0D6B4D'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, headerGradientStart: e.target.value }
                    })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.customization?.headerGradientStart || formData.customization?.primaryColor || '#0D6B4D'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, headerGradientStart: e.target.value }
                    })}
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
                    value={formData.customization?.headerGradientEnd || '#0b5940'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, headerGradientEnd: e.target.value }
                    })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.customization?.headerGradientEnd || '#0b5940'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, headerGradientEnd: e.target.value }
                    })}
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
                    value={formData.customization?.headerTextColor || '#ffffff'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, headerTextColor: e.target.value }
                    })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.customization?.headerTextColor || '#ffffff'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, headerTextColor: e.target.value }
                    })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 text-sm"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Card Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.customization?.textColor || '#ffffff'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, textColor: e.target.value }
                    })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.customization?.textColor || '#ffffff'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, textColor: e.target.value }
                    })}
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
                    value={formData.customization?.cardBackgroundColor || '#2a2a2a'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, cardBackgroundColor: e.target.value }
                    })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.customization?.cardBackgroundColor || '#2a2a2a'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, cardBackgroundColor: e.target.value }
                    })}
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
                    value={formData.customization?.secondaryButtonColor || '#3a3a3a'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, secondaryButtonColor: e.target.value }
                    })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.customization?.secondaryButtonColor || '#3a3a3a'}
                    onChange={(e) => setFormData({
                      ...formData,
                      customization: { ...formData.customization, secondaryButtonColor: e.target.value }
                    })}
                    className="flex-1 bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 text-sm"
                    placeholder="#3a3a3a"
                  />
                </div>
              </div>
            </div>
          </Accordion>

          <Accordion title="Text Content">
            <div className="space-y-4">
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Header Title (leave empty for default)</label>
                <input
                  type="text"
                  value={formData.customization?.headerTitle || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customization: { ...formData.customization, headerTitle: e.target.value }
                  })}
                  placeholder="e.g., 🎉 Thank You For Your Purchase!"
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 placeholder:text-gray-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Header Subtitle (leave empty for default)</label>
                <input
                  type="text"
                  value={formData.customization?.headerSubtitle || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customization: { ...formData.customization, headerSubtitle: e.target.value }
                  })}
                  placeholder="e.g., Wait! Before you go, we have an exclusive offer..."
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 placeholder:text-gray-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Header Emoji</label>
                <input
                  type="text"
                  value={formData.customization?.headerEmoji || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customization: { ...formData.customization, headerEmoji: e.target.value }
                  })}
                  placeholder="🎉 (leave empty for default)"
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 placeholder:text-gray-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Accept Button Text</label>
                <input
                  type="text"
                  value={formData.customization?.acceptButtonText || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customization: { ...formData.customization, acceptButtonText: e.target.value }
                  })}
                  placeholder="e.g., Yes! Add to My Order"
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 placeholder:text-gray-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Decline Button Text</label>
                <input
                  type="text"
                  value={formData.customization?.declineButtonText || 'No Thanks'}
                  onChange={(e) => setFormData({
                    ...formData,
                    customization: { ...formData.customization, declineButtonText: e.target.value }
                  })}
                  placeholder="No Thanks"
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 placeholder:text-gray-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Trust Badge Text</label>
                <input
                  type="text"
                  value={formData.customization?.trustBadgeText || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customization: { ...formData.customization, trustBadgeText: e.target.value }
                  })}
                  placeholder="🔒 Secure one-click checkout • No need to enter payment details again"
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 placeholder:text-gray-9 text-sm"
                />
              </div>
            </div>
          </Accordion>

          <Accordion title="Button Settings">
            <div className="space-y-4">
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Button Style</label>
                <select
                  value={formData.customization?.buttonStyle || 'pill'}
                  onChange={(e) => setFormData({
                    ...formData,
                    customization: { ...formData.customization, buttonStyle: e.target.value as 'rounded' | 'square' | 'pill' }
                  })}
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 text-sm"
                >
                  <option value="pill">Pill (Rounded)</option>
                  <option value="rounded">Rounded</option>
                  <option value="square">Square</option>
                </select>
              </div>
            </div>
          </Accordion>

          <Accordion title="Product Image">
            <div className="space-y-4">
              
              {/* File Upload */}
              <div className="mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                  id="node-product-image-upload"
                />
                <label
                  htmlFor="node-product-image-upload"
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
                  value={formData.customization?.productImageUrl || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customization: { ...formData.customization, productImageUrl: e.target.value }
                  })}
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12 text-sm"
                  placeholder="https://example.com/product-image.jpg"
                />
              </div>

              {/* Preview */}
              {formData.customization?.productImageUrl && (
                <div className="mt-3">
                  <img 
                    src={formData.customization.productImageUrl} 
                    alt="Product preview" 
                    className="max-w-full h-32 object-contain rounded-lg border border-gray-a4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      customization: { ...formData.customization, productImageUrl: '' }
                    })}
                    className="mt-2 text-sm text-red-500 hover:text-red-600"
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>
          </Accordion>
            </form>
          </div>

          {/* Preview Section */}
          <div className="space-y-4 sticky top-4 self-start">
            <h3 className="text-lg font-semibold text-gray-12 mb-4">Live Preview</h3>
            <div className="bg-gray-a1 dark:bg-gray-a2 border border-gray-a4 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto">
              <div className="w-full max-w-2xl mx-auto" style={{ backgroundColor: custom.backgroundColor || '#1a1a1a' }}>
                {/* Preview Header */}
                <div 
                  className="p-6 text-center"
                  style={{
                    background: `linear-gradient(to right, ${custom.headerGradientStart || custom.primaryColor || '#0D6B4D'}, ${custom.headerGradientEnd || '#0b5940'})`
                  }}
                >
                  <h1 
                    className="text-3xl font-bold mb-2"
                    style={{ color: custom.headerTextColor || '#ffffff' }}
                  >
                    {getHeaderTitle()}
                  </h1>
                  <p 
                    className="text-sm"
                    style={{ color: custom.headerTextColor ? `${custom.headerTextColor}CC` : 'rgba(255, 255, 255, 0.9)' }}
                  >
                    {getHeaderSubtitle()}
                  </p>
                </div>

                {/* Preview Content */}
                <div className="p-8" style={{ backgroundColor: custom.cardBackgroundColor || '#2a2a2a' }}>
                  {custom.productImageUrl && (
                    <div className="mb-6 flex justify-center">
                      <img 
                        src={custom.productImageUrl} 
                        alt="Product" 
                        className="max-w-full h-40 object-contain rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-3" style={{ color: custom.textColor || '#ffffff' }}>
                      {previewData.title}
                    </h2>
                    <p className="text-lg mb-4" style={{ color: custom.textColor ? 'rgba(255,255,255,0.7)' : '#d1d5db' }}>
                      {previewData.description}
                    </p>
                    
                    <div className="flex items-center justify-center gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold" style={{ color: custom.primaryColor || '#0D6B4D' }}>
                          ${previewData.price.toFixed(2)}
                        </div>
                        <div className="text-sm mt-1" style={{ color: custom.textColor ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>
                          {custom.priceLabel || 'One-time Price'}
                        </div>
                      </div>
                      {previewData.original_price && previewData.original_price > previewData.price && (
                        <>
                          <div style={{ color: custom.textColor ? 'rgba(255,255,255,0.5)' : '#6b7280' }}>vs</div>
                          <div className="text-center">
                            <div className="text-2xl font-bold line-through" style={{ color: custom.textColor ? 'rgba(255,255,255,0.5)' : '#6b7280' }}>
                              ${previewData.original_price.toFixed(2)}
                            </div>
                            <div className="text-sm mt-1" style={{ color: custom.textColor ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>
                              {custom.originalPriceLabel || 'Regular Price'}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {previewData.savings > 0 && (
                      <div 
                        className="border rounded-lg p-4 mb-6"
                        style={{
                          backgroundColor: `${custom.primaryColor || '#0D6B4D'}20`,
                          borderColor: `${custom.primaryColor || '#0D6B4D'}40`
                        }}
                      >
                        <p className="font-semibold" style={{ color: custom.primaryColor || '#0D6B4D' }}>
                          💰 You Save ${previewData.savings.toFixed(2)}!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Preview Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      disabled
                      className={`flex-1 font-bold py-4 px-6 opacity-75 cursor-not-allowed text-lg ${getButtonStyle()}`}
                      style={{
                        backgroundColor: custom.primaryColor || '#0D6B4D',
                        color: custom.buttonTextColor || '#ffffff'
                      }}
                    >
                      {getAcceptButtonText()}
                    </button>
                    <button
                      disabled
                      className={`flex-1 font-semibold py-4 px-6 opacity-75 cursor-not-allowed ${getButtonStyle()}`}
                      style={{
                        backgroundColor: custom.secondaryButtonColor || '#3a3a3a',
                        color: custom.buttonTextColor || '#ffffff'
                      }}
                    >
                      {custom.declineButtonText || 'No Thanks'}
                    </button>
                  </div>

                  {/* Preview Trust Badge */}
                  <div className="mt-8 text-center">
                    <p className="text-xs" style={{ color: custom.textColor || '#ffffff', opacity: 0.6 }}>
                      {custom.trustBadgeText || '🔒 Secure one-click checkout • No need to enter payment details again'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
          <Button color="gray" variant="soft" onClick={onClose}>Cancel</Button>
          <Button 
            color="tomato" 
            variant="classic" 
            onClick={(e) => {
              const form = e.currentTarget.closest('form') || document.querySelector('form');
              if (form) {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);
              }
            }}
          >
            {node ? 'Update' : 'Create'} Node
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

