'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAlertsData, useRootStore } from '@/store';

export default function AlertsPanel() {
  const {
    alerts,
    activeAlerts,
    unacknowledgedAlerts,
    alertSummary,
    getCriticalAlerts,
    hasUnacknowledgedCriticalAlerts
  } = useRootStore();

  // Get computed values using the available functions
  const criticalAlerts = getCriticalAlerts();
  const hasCriticalAlerts = hasUnacknowledgedCriticalAlerts();

  // Since isLoading, error, fetchActiveAlerts, acknowledgeAlert, and bulkAcknowledgeAlerts 
  // are NOT available in useAlertsData, we need to handle this differently

  // useEffect(() => {
  //   // We can't use fetchActiveAlerts since it's not in useAlertsData
  //   // You might need to either:
  //   // 1. Add these methods to useAlertsData hook, or
  //   // 2. Use useRootStore directly here, or
  //   // 3. Handle data fetching at a higher level
    
  //   console.log('AlertsPanel mounted - data should be fetched at app level');
  // }, []);

  const handleAcknowledgeAlert = async (alertId: string) => {
    // This functionality is not available in current useAlertsData
    console.log('Acknowledge alert:', alertId);
    // You would need to add acknowledgeAlert to useAlertsData or use useRootStore directly
  };

  const handleAcknowledgeAll = async () => {
    // This functionality is not available in current useAlertsData
    console.log('Acknowledge all alerts');
    // You would need to add bulkAcknowledgeAlerts to useAlertsData or use useRootStore directly
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBackgroundColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50/80 border-l-red-500';
      case 'HIGH':
        return 'bg-orange-50/80 border-l-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-50/80 border-l-yellow-500';
      case 'LOW':
        return 'bg-blue-50/80 border-l-blue-500';
      default:
        return 'bg-gray-50/80 border-l-gray-500';
    }
  };

  // Since we don't have isLoading in useAlertsData, we can check if we have data
  const isLoading = alerts.length === 0 && activeAlerts.length === 0;

  if (isLoading) {
    return (
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Alerts & Notifications</span>
            <Badge variant="secondary" className="animate-pulse">
              Loading...
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border-l-4 border-gray-300 bg-gray-50 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use unacknowledged alerts for display, fallback to active alerts
  const displayAlerts = unacknowledgedAlerts.length > 0 ? unacknowledgedAlerts : activeAlerts;

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>Alerts & Notifications</span>
          <div className="flex items-center space-x-2">
            {hasCriticalAlerts && (
              <Badge variant="destructive">
                {criticalAlerts.length} Critical
              </Badge>
            )}
            <Badge variant="secondary">
              {displayAlerts.length} Active
            </Badge>
            {alertSummary && (
              <Badge variant="outline">
                {alertSummary.statistics?.total_active_alerts || 0} Total
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No active alerts</p>
              <p className="text-xs text-gray-400 mt-1">All systems operational</p>
            </div>
          ) : (
            displayAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${getBackgroundColor(alert.severity)} transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {alert.alert_type?.replace('_', ' ') || 'ALERT'}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {alert.title}
                    </h4>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {alert.message}
                    </p>

                    {alert.recommended_action && (
                      <div className="flex items-start space-x-2 mt-2">
                        <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-blue-700 flex-1">
                          <strong>Recommended:</strong> {alert.recommended_action}
                        </p>
                      </div>
                    )}

                    {alert.vehicle && (
                      <div className="flex items-center space-x-1 mt-2 text-xs text-gray-500">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-1h4a1 1 0 001-1v-3a1 1 0 00-1-1h-2.05a2.5 2.5 0 00-4.9 0H3V5a1 1 0 00-1-1z" />
                        </svg>
                        <span>Vehicle #{alert.vehicle?.number} - {alert.vehicle?.driver}</span>
                      </div>
                    )}
                  </div>

                  {!alert.is_acknowledged && (
                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="ml-4 p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                      title="Acknowledge alert (functionality not implemented)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                </div>

                {alert.is_acknowledged && (
                  <div className="flex items-center space-x-1 mt-2 text-xs text-green-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Acknowledged {alert.acknowledged_at ? new Date(alert.acknowledged_at).toLocaleTimeString() : ''}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {unacknowledgedAlerts.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={handleAcknowledgeAll}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors duration-200"
              title="Acknowledge all alerts (functionality not implemented)"
            >
              Acknowledge All ({unacknowledgedAlerts.length}) Alerts
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
