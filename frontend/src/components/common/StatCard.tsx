import React from 'react';
import { Card, Statistic, Progress, Typography, Space, Tag } from 'antd';
import type { StatisticProps } from 'antd';

const { Text } = Typography;

interface StatCardProps extends Omit<StatisticProps, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  extra?: React.ReactNode;
  trend?: {
    value: number;
    isPositive?: boolean;
    label?: string;
  };
  progress?: {
    percent: number;
    status?: 'normal' | 'success' | 'exception' | 'active';
    strokeColor?: string;
    showInfo?: boolean;
  };
  size?: 'small' | 'default' | 'large';
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
  bordered?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  subtitle,
  extra,
  trend,
  progress,
  size = 'default',
  loading = false,
  className,
  style,
  bordered = true,
  hoverable = false,
  onClick,
  ...statisticProps
}) => {
  const renderTrend = () => {
    if (!trend) return null;

    const trendColor = trend.isPositive ? '#52c41a' : '#ff4d4f';
    const trendSymbol = trend.isPositive ? '↗' : '↘';

    return (
      <Space align="center" style={{ marginTop: 4 }}>
        <Text
          style={{
            color: trendColor,
            fontSize: 12,
            fontWeight: 'bold'
          }}
        >
          {trendSymbol} {Math.abs(trend.value)}%
        </Text>
        {trend.label && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {trend.label}
          </Text>
        )}
      </Space>
    );
  };

  const renderProgress = () => {
    if (!progress) return null;

    return (
      <Progress
        percent={progress.percent}
        status={progress.status}
        strokeColor={progress.strokeColor}
        showInfo={progress.showInfo}
        size="small"
        style={{ marginTop: 8 }}
      />
    );
  };

  const cardStyle: React.CSSProperties = {
    cursor: onClick ? 'pointer' : undefined,
    transition: hoverable ? 'all 0.3s' : undefined,
    ...style
  };

  const cardSize = size === 'small' ? 'small' : 'default';

  return (
    <Card
      size={cardSize}
      loading={loading}
      bordered={bordered}
      hoverable={hoverable}
      className={className}
      style={cardStyle}
      onClick={onClick}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={4}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Text
              strong
              style={{
                fontSize: size === 'large' ? 16 : size === 'small' ? 12 : 14,
                color: 'rgba(0, 0, 0, 0.85)'
              }}
            >
              {title}
            </Text>
            {subtitle && (
              <div style={{ marginTop: 2 }}>
                <Text
                  type="secondary"
                  style={{
                    fontSize: size === 'large' ? 12 : size === 'small' ? 11 : 12
                  }}
                >
                  {subtitle}
                </Text>
              </div>
            )}
          </div>
          {extra && (
            <div style={{ marginLeft: 8 }}>
              {extra}
            </div>
          )}
        </div>

        {/* Main Statistic */}
        <Statistic
          {...statisticProps}
          title=""
          valueStyle={{
            fontSize: size === 'large' ? 32 : size === 'small' ? 20 : 24,
            fontWeight: 'bold',
            lineHeight: 1.2,
            ...statisticProps.valueStyle
          }}
        />

        {/* Trend */}
        {renderTrend()}

        {/* Progress */}
        {renderProgress()}
      </Space>
    </Card>
  );
};

export default StatCard;