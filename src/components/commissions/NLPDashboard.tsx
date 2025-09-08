import React, { useState, useEffect } from 'react';
import { BaseCommissionDashboard} from './BaseCommissionDashboard';
import { COMMISSION_TYPES} from '../../lib/stripe/stripe-client';
import { useTranslations} from '../../hooks/useTranslations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import {
  ChatBubbleLeftRightIcon,
  LanguageIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  TranslateIcon,
  SpeakerWaveIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

interface NLPMetrics {
  documentsProcessed: number;
  sentimentAccuracy: number;
  languagesSupported: number;
  modelsDeployed: number;
  avgProcessingTime: number;
  apiCallsToday: number;
}

interface LanguageModel {
  id: string;
  name: string;
  description: string;
  type: 'sentiment' | 'classification' | 'ner' | 'translation' | 'summarization';
  language: string;
  accuracy: number;
  lastTrained: Date;
  usageCount: number;
}

interface TextSample {
  id: string;
  text: string;
  language: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence?: number;
  entities?: Array<{ text: string; label: string; confidence: number }>;
}

const LANGUAGE_MODELS: LanguageModel[] = [
  {
    id: 'sentiment-es',
    name: 'Spanish Sentiment Analyzer',
    description: 'Fine-tuned BERT model for Spanish sentiment analysis',
    type: 'sentiment',
    language: 'Spanish',
    accuracy: 94.2,
    lastTrained: new Date('2024-01-10'),
    usageCount: 1245,
  },
  {
    id: 'ner-en',
    name: 'English NER Model',
    description: 'Named Entity Recognition for English text',
    type: 'ner',
    language: 'English',
    accuracy: 91.8,
    lastTrained: new Date('2024-01-08'),
    usageCount: 856,
  },
  {
    id: 'classify-multi',
    name: 'Multilingual Text Classifier',
    description: 'Document classification for multiple languages',
    type: 'classification',
    language: 'Multilingual',
    accuracy: 89.5,
    lastTrained: new Date('2024-01-12'),
    usageCount: 634,
  },
  {
    id: 'summarize-es',
    name: 'Spanish Text Summarizer',
    description: 'Extractive and abstractive summarization for Spanish',
    type: 'summarization',
    language: 'Spanish',
    accuracy: 87.3,
    lastTrained: new Date('2024-01-05'),
    usageCount: 423,
  },
];

// Sample data for visualizations
const sentimentData = [
  { name: 'Positive', value: 45, color: '#10B981' },
  { name: 'Neutral', value: 35, color: '#6B7280' },
  { name: 'Negative', value: 20, color: '#EF4444' },
];

const languageDistribution = [
  { language: 'Spanish', count: 1245, percentage: 42 },
  { language: 'English', count: 987, percentage: 33 },
  { language: 'Portuguese', count: 456, percentage: 15 },
  { language: 'French', count: 234, percentage: 8 },
  { language: 'Others', count: 78, percentage: 2 },
];

const modelPerformance = [
  { month: 'Jan', accuracy: 89.2, speed: 145 },
  { month: 'Feb', accuracy: 90.1, speed: 142 },
  { month: 'Mar', accuracy: 91.5, speed: 138 },
  { month: 'Apr', accuracy: 92.3, speed: 135 },
  { month: 'May', accuracy: 93.1, speed: 132 },
  { month: 'Jun', accuracy: 94.2, speed: 128 },
];

export const NLPDashboard: React.FC = () => {
  const { t } = useTranslations();
  const [metrics, setMetrics] = useState<NLPMetrics>({
    documentsProcessed: 12845,
    sentimentAccuracy: 94.2,
    languagesSupported: 15,
    modelsDeployed: 8,
    avgProcessingTime: 128,
    apiCallsToday: 2347,
  });

  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('sentiment-es');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleTextAnalysis = async () => {
    if (!inputText.trim()) return;
    
    setIsAnalyzing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock analysis results
    const model = LANGUAGE_MODELS.find(m => m.id === selectedModel);
    let result: any = { model: model?.name };
    
    switch (model?.type) {
      case 'sentiment':
        result.sentiment = ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)];
        result.confidence = (Math.random() * 0.3 + 0.7).toFixed(3);
        break;
      case 'ner':
        result.entities = [
          { text: 'Mexico', label: 'LOCATION', confidence: 0.95 },
          { text: 'UNAM', label: 'ORGANIZATION', confidence: 0.89 },
          { text: 'January', label: 'DATE', confidence: 0.76 },
        ];
        break;
      case 'classification':
        result.category = ['Technology', 'Science', 'Business', 'Education'][Math.floor(Math.random() * 4)];
        result.confidence = (Math.random() * 0.3 + 0.7).toFixed(3);
        break;
      case 'summarization':
        result.summary = 'This is a generated summary of the input text highlighting the main points and key information.';
        break;
    }
    
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const customMetrics = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* NLP Specific Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('nlp.performanceMetrics')}
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('nlp.sentimentAccuracy')}</span>
            <span className="text-lg font-semibold text-green-600">
              {metrics.sentimentAccuracy}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('nlp.avgProcessingTime')}</span>
            <span className="text-lg font-semibold text-blue-600">
              {metrics.avgProcessingTime}ms
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('nlp.apiCallsToday')}</span>
            <span className="text-lg font-semibold text-purple-600">
              {metrics.apiCallsToday.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Language Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('nlp.languageDistribution')}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={sentimentData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#3B82F6"
              dataKey="value"
              label={(entry) => `${entry['name']}: ${entry.value}%`}
            >
              {sentimentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const customTools = (
    <div className="space-y-8">
      {/* Interactive Text Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('nlp.textAnalysisPlayground')}
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('nlp.selectModel')}
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {LANGUAGE_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.language})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('nlp.inputText')}
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('nlp.textPlaceholder')}
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2 resize-none"
              />
            </div>
            
            <button
              onClick={handleTextAnalysis}
              disabled={!inputText.trim() || isAnalyzing}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('nlp.analyzing')}
                </div>
              ) : (
                t('nlp.analyzeText')
              )}
            </button>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">
              {t('nlp.analysisResults')}
            </h4>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[200px]">
              {analysisResult ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <SparklesIcon className="w-4 h-4" />
                    <span>{t('nlp.model')}: {analysisResult.model}</span>
                  </div>
                  
                  {analysisResult.sentiment && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{t('nlp.sentiment')}:</span>
                        <span className={`px-2 py-1 rounded text-sm ${
                          analysisResult.sentiment === 'positive' 
                            ? 'bg-green-100 text-green-800'
                            : analysisResult.sentiment === 'negative'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {analysisResult.sentiment}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {t('nlp.confidence')}: {(parseFloat(analysisResult.confidence) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                  
                  {analysisResult.entities && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{t('nlp.entities')}:</div>
                      <div className="space-y-1">
                        {analysisResult.entities.map((entity: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {entity.text}
                            </span>
                            <span className="text-gray-600">
                              {entity.label} ({(entity.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysisResult.category && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{t('nlp.category')}:</span>
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                          {analysisResult.category}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {t('nlp.confidence')}: {(parseFloat(analysisResult.confidence) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                  
                  {analysisResult.summary && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{t('nlp.summary')}:</div>
                      <div className="text-sm text-gray-700 bg-white p-3 rounded border">
                        {analysisResult.summary}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">{t('nlp.noResults')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Model Performance Dashboard */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('nlp.modelPerformance')}
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('nlp.accuracyTrend')}
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={modelPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Accuracy (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Language Processing */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('nlp.processingByLanguage')}
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={languageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="language" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Available Models */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('nlp.availableModels')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LANGUAGE_MODELS.map((model) => {
            const typeIcons = {
              sentiment: ChatBubbleLeftRightIcon,
              classification: ClipboardDocumentCheckIcon,
              ner: MagnifyingGlassIcon,
              translation: TranslateIcon,
              summarization: DocumentTextIcon,
            };
            
            const Icon = typeIcons[model.type];
            
            return (
              <div key={model.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{model['name']}</h4>
                    <p className="text-sm text-gray-600">{model['description']}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{t('nlp.language')}:</span>
                    <span className="ml-1 font-medium">{model.language}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('nlp.accuracy')}:</span>
                    <span className="ml-1 font-medium text-green-600">{model.accuracy}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('nlp.usage')}:</span>
                    <span className="ml-1 font-medium">{model.usageCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('nlp.lastTrained')}:</span>
                    <span className="ml-1 font-medium">{model.lastTrained.toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <button className="flex-1 bg-green-600 text-white py-1 px-3 rounded text-sm hover:bg-green-700">
                    {t('nlp.useModel')}
                  </button>
                  <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                    {t('nlpdetails')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NLP Tools & Resources */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('nlp.toolsAndResources')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              name: t('nlp.textPreprocessing'), 
              desc: t('nlp.textPreprocessingDesc'), 
              icon: DocumentTextIcon,
              color: 'bg-blue-100 text-blue-600'
            },
            { 
              name: t('nlp.languageDetection'), 
              desc: t('nlp.languageDetectionDesc'), 
              icon: LanguageIcon,
              color: 'bg-green-100 text-green-600'
            },
            { 
              name: t('nlp.speechProcessing'), 
              desc: t('nlp.speechProcessingDesc'), 
              icon: SpeakerWaveIcon,
              color: 'bg-purple-100 text-purple-600'
            },
            { 
              name: t('nlp.modelTraining'), 
              desc: t('nlp.modelTrainingDesc'), 
              icon: SparklesIcon,
              color: 'bg-orange-100 text-orange-600'
            },
          ].map((tool, index) => {
            const Icon = tool.icon;
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-sm transition-shadow">
                <div className={`p-3 ${tool.color} rounded-lg inline-block mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">{tool['name']}</h4>
                <p className="text-sm text-gray-600">{tool.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <BaseCommissionDashboard
      commissionId={COMMISSION_TYPES.NLP}
      customMetrics={customMetrics}
      customTools={customTools}
    />
  );
};

export default NLPDashboard;