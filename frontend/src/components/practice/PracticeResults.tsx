import React from 'react';
import { 
  Card, 
  Result, 
  Button, 
  Typography, 
  Space, 
  Progress,
  Statistic,
  Row,
  Col,
  Tag,
  List,
  Divider,
  Alert,
  Tooltip,
  theme
} from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  BookOutlined,
  BarChartOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { PracticeSession, Question } from '../../types';

const { Title, Text } = Typography;

interface PracticeResultsProps {
  session: PracticeSession;
  questions: Question[];
  onRestart: () => void;
  onExit: () => void;
}

const PracticeResults: React.FC<PracticeResultsProps> = ({ 
  session, 
  questions, 
  onRestart, 
  onExit 
}) => {
  const { token } = theme.useToken();
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPerformanceLevel = (accuracy: number) => {
    if (accuracy >= 90) return { level: '優秀', color: 'success', icon: <TrophyOutlined /> };
    if (accuracy >= 80) return { level: '良好', color: 'processing', icon: <CheckCircleOutlined /> };
    if (accuracy >= 70) return { level: '及格', color: 'warning', icon: <BookOutlined /> };
    return { level: '需加強', color: 'error', icon: <CloseCircleOutlined /> };
  };

  const getDifficultyAdjustmentInfo = (accuracy: number) => {
    // Handle invalid accuracy values
    if (typeof accuracy !== 'number' || isNaN(accuracy)) {
      return {
        message: '系統正在分析您的答題表現，請稍後查看難度調整結果。',
        type: 'info' as const,
        action: '分析中'
      };
    }

    let adjustment: { message: string; type: 'info' | 'success' | 'warning' | 'error'; action: string } = {
      message: '',
      type: 'info',
      action: ''
    };

    if (accuracy > 80) {
      adjustment = {
        message: '表現優異！系統已自動提高相關題目難度，為您帶來更大挑戰。',
        type: 'success',
        action: '難度提高'
      };
    } else if (accuracy >= 60) {
      adjustment = {
        message: '表現穩定，題目難度保持不變。',
        type: 'info',
        action: '維持難度'
      };
    } else if (accuracy >= 40) {
      adjustment = {
        message: '系統已適當降低相關題目難度，幫助您更好地掌握知識點。',
        type: 'warning',
        action: '難度微調'
      };
    } else if (accuracy >= 20) {
      adjustment = {
        message: '系統已顯著降低相關題目難度，建議重點複習基礎知識。',
        type: 'warning',
        action: '難度降低'
      };
    } else {
      adjustment = {
        message: '系統已大幅降低相關題目難度，建議從基礎開始重新學習。',
        type: 'error',
        action: '大幅調整'
      };
    }

    return adjustment;
  };

  const performance = getPerformanceLevel(session.accuracy || 0);
  
  const incorrectQuestions = (session.questions || [])
    .filter(q => q && !q.isCorrect)
    .map(q => {
      const question = questions.find(ques => ques.id === q.questionId);
      return { ...q, questionData: question };
    })
    .filter(item => item.questionData); // Filter out items without question data

  const markedQuestions = (session.questions || [])
    .filter(q => q && q.marked)
    .map(q => {
      const question = questions.find(ques => ques.id === q.questionId);
      return { ...q, questionData: question };
    })
    .filter(item => item.questionData); // Filter out items without question data

  const averageTimePerQuestion = session.duration > 0 ? session.duration / session.totalQuestions : 0;
  const completionRate = (session.questions || []).filter(q => q && (q.userAnswer || []).length > 0).length / session.totalQuestions * 100;
  
  const renderStatistics = () => (
    <Card title="測驗統計" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={12} sm={6}>
          <Statistic
            title="總題數"
            value={session.totalQuestions}
            prefix={<BookOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="正確題數"
            value={session.correctCount}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="錯誤題數"
            value={session.totalQuestions - session.correctCount}
            prefix={<CloseCircleOutlined />}
            valueStyle={{ color: '#cf1322' }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="總用時"
            value={formatTime(session.duration)}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
      </Row>

      <Divider />

      <Row gutter={16} style={{ marginBottom: 16 }}>  
        <Col xs={12} sm={6}>
          <Statistic
            title="平均每題用時"
            value={formatTime(Math.round(averageTimePerQuestion))}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ fontSize: '16px' }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="完成率"
            value={Math.round(completionRate)}
            suffix="%"
            valueStyle={{ fontSize: '16px' }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="標記題數"
            value={markedQuestions.length}
            valueStyle={{ fontSize: '16px' }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="測驗日期"
            value={new Date(session.startTime).toLocaleDateString()}
            valueStyle={{ fontSize: '16px' }}
          />
        </Col>
      </Row>

      <Divider />

      {/* Dynamic Difficulty Adjustment Notification */}
      <div style={{ marginBottom: 16 }}>
        {(() => {
          const difficultyInfo = getDifficultyAdjustmentInfo(session.accuracy || 0);
          return (
            <Alert
              message={
                <Space>
                  <BarChartOutlined />
                  <Text strong>智能難度調整：{difficultyInfo.action}</Text>
                  <Tooltip title="基於您的答題準確率，系統會自動調整相關題目的難度等級，以提供更適合的學習體驗。">
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
              }
              description={difficultyInfo.message}
              type={difficultyInfo.type}
              showIcon
              style={{ marginBottom: 16 }}
            />
          );
        })()}
      </div>

      <Row justify="center">
        <Col>
          <Space direction="vertical" align="center">
            <Progress
              type="circle"
              percent={Math.round(session.accuracy || 0)}
              format={percent => `${percent}%`}
              strokeColor={
                (session.accuracy || 0) >= 80 ? '#52c41a' : 
                (session.accuracy || 0) >= 60 ? '#faad14' : '#ff4d4f'
              }
              size={120}
            />
            <div style={{ textAlign: 'center' }}>
              <Tag color={performance.color} icon={performance.icon} style={{ fontSize: 16, padding: '4px 12px' }}>
                {performance.level}
              </Tag>
            </div>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // Helper function to get option text by ID
  const getOptionText = (questionData: Question | undefined, optionId: string): string => {
    if (!questionData?.options) return optionId;
    
    try {
      const options = typeof questionData.options === 'string' 
        ? JSON.parse(questionData.options)
        : questionData.options;
      
      if (Array.isArray(options)) {
        const option = options.find(opt => opt.id === optionId);
        return option?.text || optionId;
      }
    } catch (error) {
      console.error('Error parsing options:', error);
    }
    
    return optionId;
  };

  // Helper function to format answer display
  const formatAnswerDisplay = (answerIds: string[], questionData: Question | undefined): string => {
    if (!answerIds || answerIds.length === 0) return '未作答';
    
    return answerIds.map(id => {
      const optionText = getOptionText(questionData, id);
      return optionText !== id ? `${id} (${optionText})` : id;
    }).join(', ');
  };

  const renderIncorrectQuestions = () => {
    if (incorrectQuestions.length === 0) {
      return (
        <Card title="錯誤題目" style={{ marginBottom: 16 }}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="太棒了！"
            subTitle="沒有答錯的題目"
          />
        </Card>
      );
    }

    return (
      <Card title={`錯誤題目 (${incorrectQuestions.length})`} style={{ marginBottom: 16 }}>
        <List
          dataSource={incorrectQuestions}
          renderItem={(item, index) => (
            <List.Item key={`incorrect-${item.questionId}-${index}`}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>題目 {index + 1}:</Text>
                  <Text style={{ marginLeft: 8 }}>
                    {item.questionData?.question || '題目資料未找到'}
                  </Text>
                </div>
                <div>
                  <Text type="danger">
                    您的答案: {formatAnswerDisplay(item.userAnswer || [], item.questionData)}
                  </Text>
                </div>
                <div>
                  <Text type="success">
                    正確答案: {formatAnswerDisplay(item.questionData?.answer || [], item.questionData)}
                  </Text>
                </div>
                {item.questionData?.explanation && (
                  <div style={{ 
                    marginTop: 8, 
                    padding: 12, 
                    backgroundColor: token.colorFillQuaternary, 
                    borderRadius: token.borderRadius,
                    border: `1px solid ${token.colorBorder}`,
                    color: token.colorText
                  }}>
                    <Text strong>解釋: </Text>
                    <Text>{item.questionData.explanation}</Text>
                  </div>
                )}
              </Space>
            </List.Item>
          )}
        />
      </Card>
    );
  };

  const renderMarkedQuestions = () => {
    if (markedQuestions.length === 0) return null;

    return (
      <Card title={`標記題目 (${markedQuestions.length})`} style={{ marginBottom: 16 }}>
        <List
          dataSource={markedQuestions}
          renderItem={(item, index) => (
            <List.Item key={`marked-${item.questionId}-${index}`}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>題目 {index + 1}:</Text>
                  <Text style={{ marginLeft: 8 }}>
                    {item.questionData?.question || '題目資料未找到'}
                  </Text>
                </div>
                <div>
                  <Tag color={item.isCorrect ? 'success' : 'error'}>
                    {item.isCorrect ? '正確' : '錯誤'}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary">
                    您的答案: {formatAnswerDisplay(item.userAnswer || [], item.questionData)}
                  </Text>
                </div>
                <div>
                  <Text type="success">
                    正確答案: {formatAnswerDisplay(item.questionData?.answer || [], item.questionData)}
                  </Text>
                </div>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Result
        status={(session.accuracy || 0) >= 70 ? 'success' : 'warning'}
        title={(session.accuracy || 0) >= 70 ? '測驗完成！' : '測驗完成'}
        subTitle={
          <Space direction="vertical" align="center">
            <Text style={{ fontSize: 18 }}>
              正確率: {(session.accuracy || 0).toFixed(1)}% ({session.correctCount}/{session.totalQuestions})
            </Text>
            <Text type="secondary">
              總用時: {formatTime(session.duration)} | 平均每題: {formatTime(Math.round(averageTimePerQuestion))}
            </Text>
            {session.mode === 'test' && (
              <Tag color={performance.color} style={{ marginTop: 8 }}>
                {performance.level}
              </Tag>
            )}
          </Space>
        }
        extra={[
          <Button type="primary" key="restart" onClick={onRestart}>
            重新測驗
          </Button>,
          <Button key="exit" onClick={onExit}>
            返回主頁
          </Button>,
        ]}
      />

      {renderStatistics()}
      {renderIncorrectQuestions()}
      {renderMarkedQuestions()}
    </div>
  );
};

export default PracticeResults;