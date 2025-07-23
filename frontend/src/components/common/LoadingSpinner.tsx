import React from 'react';
import { Spin, Typography, Space } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large';
  message?: string;
  spinning?: boolean;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'default',
  message,
  spinning = true,
  style,
  className,
  children
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 32 : size === 'small' ? 16 : 24 }} spin />;

  if (children) {
    return (
      <Spin 
        spinning={spinning} 
        indicator={antIcon}
        style={style}
        className={className}
        tip={message}
      >
        {children}
      </Spin>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 100,
        ...style
      }}
      className={className}
    >
      <Space direction="vertical" align="center">
        <Spin indicator={antIcon} spinning={spinning} />
        {message && (
          <Text type="secondary" style={{ marginTop: 8 }}>
            {message}
          </Text>
        )}
      </Space>
    </div>
  );
};

export default LoadingSpinner;