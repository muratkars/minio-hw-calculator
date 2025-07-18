import React from 'react';
import { ValidationResult, getBestPracticesSummary } from '../config/field-architect-best-practices';

interface FieldArchitectRecommendationsProps {
  validationResults?: ValidationResult[];
  recommendations?: string[];
  isCompliant?: boolean;
  showBestPractices?: boolean;
}

const FieldArchitectRecommendations: React.FC<FieldArchitectRecommendationsProps> = ({
  validationResults = [],
  recommendations = [],
  isCompliant = true,
  showBestPractices = false
}) => {
  const bestPractices = getBestPracticesSummary();

  const getValidationIcon = (level: 'error' | 'warning' | 'info') => {
    switch (level) {
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getValidationBgColor = (level: 'error' | 'warning' | 'info') => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (showBestPractices) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">
            MinIO Field Architect Best Practices
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(bestPractices).map(([key, practice]: [string, any]) => (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{practice.title}</h4>
              <div className="space-y-1 text-sm text-gray-600">
                {practice.minimum && (
                  <div><span className="font-medium">Minimum:</span> {practice.minimum}</div>
                )}
                {practice.recommended && (
                  <div><span className="font-medium">Recommended:</span> {practice.recommended}</div>
                )}
                {practice.sockets && (
                  <div><span className="font-medium">Sockets:</span> {practice.sockets}</div>
                )}
                {practice.upTo1PB && (
                  <div><span className="font-medium">Up to 1PB:</span> {practice.upTo1PB}</div>
                )}
                {practice.over1PB && (
                  <div><span className="font-medium">1PB-1EB:</span> {practice.over1PB}</div>
                )}
                <p className="text-xs text-gray-500 mt-2">{practice.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasValidationResults = validationResults.length > 0;
  const hasRecommendations = recommendations.length > 0;

  if (!hasValidationResults && !hasRecommendations) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Compliance Status */}
      <div className={`rounded-lg p-4 border ${isCompliant 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center">
          {isCompliant ? (
            <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <span className={`font-medium ${isCompliant ? 'text-green-800' : 'text-red-800'}`}>
            {isCompliant 
              ? 'Configuration meets Field Architect requirements' 
              : 'Configuration has Field Architect compliance issues'
            }
          </span>
        </div>
      </div>

      {/* Validation Results */}
      {hasValidationResults && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Validation Results</h3>
          <div className="space-y-3">
            {validationResults.map((result, index) => (
              <div 
                key={index} 
                className={`rounded-lg p-4 border ${getValidationBgColor(result.level)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3 mt-0.5">
                    {getValidationIcon(result.level)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="font-medium text-sm text-gray-900 mr-2">
                        {result.category}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full uppercase font-medium ${
                        result.level === 'error' 
                          ? 'bg-red-100 text-red-800' 
                          : result.level === 'warning'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {result.level}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                    {result.recommendation && (
                      <p className="text-sm text-gray-600 italic">
                        💡 {result.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {hasRecommendations && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Field Architect Recommendations</h3>
          <div className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start">
                <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldArchitectRecommendations;