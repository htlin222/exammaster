import React, { useEffect, useState } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Popconfirm, 
  Input,
  Modal,
  message,
  Empty,
  Spin,
  Tooltip
} from 'antd';
import { 
  PlayCircleOutlined, 
  DeleteOutlined, 
  EditOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useWrongQuestionStore } from '../../stores/wrongQuestionStore';
import { usePracticeStore } from '../../stores/practiceStore';
import { WrongQuestionWithDetails } from '../../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface WrongQuestionsListProps {
  onStartPractice?: () => void;
}

const WrongQuestionsList: React.FC<WrongQuestionsListProps> = ({ onStartPractice }) => {
  const {
    wrongQuestionsWithDetails,
    loading,
    loadWrongQuestionsWithDetails,
    removeWrongQuestion,
    updateReview,
    getWrongQuestionCount,
    getUnreviewedCount
  } = useWrongQuestionStore();

  const { startPractice } = usePracticeStore();

  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    loadWrongQuestionsWithDetails();
  }, [loadWrongQuestionsWithDetails]);

  const handleStartPractice = async () => {
    try {
      const { getWrongQuestionsForPractice } = useWrongQuestionStore.getState();
      const questions = await getWrongQuestionsForPractice();
      
      if (questions.length === 0) {
        message.info('沒有錯題可以複習');
        return;
      }

      startPractice(questions, 'wrong-questions', 'wrong-questions');
      onStartPractice?.();
    } catch (error) {
      console.error('Failed to start wrong questions practice:', error);
      message.error('啟動錯題複習失敗');
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    try {
      await removeWrongQuestion(questionId);
      message.success('已從錯題本中移除');
    } catch (error) {
      message.error('移除失败');
    }
  };

  const handleUpdateNotes = async (questionId: string) => {
    try {
      await updateReview(questionId, false, editNotes);
      setEditingQuestion(null);
      setEditNotes('');
      message.success('笔记已更新');
    } catch (error) {
      message.error('更新笔记失败');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const renderQuestionItem = (item: WrongQuestionWithDetails) => {
    const { wrongQuestion, question } = item;
    
    return (
      <List.Item
        key={wrongQuestion.id}
        actions={[
          <Tooltip title="编辑笔记">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingQuestion(wrongQuestion.questionId);
                setEditNotes(wrongQuestion.notes);
              }}
            />
          </Tooltip>,
          <Popconfirm
            title="確定要從錯題本中移除這道題嗎？"
            onConfirm={() => handleRemoveQuestion(wrongQuestion.questionId)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="移除錯題">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        ]}
      >
        <List.Item.Meta
          title={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text strong>{question.question}</Text>
                {question.difficulty && (
                  <Tag color={
                    question.difficulty <= 2 ? 'green' : 
                    question.difficulty <= 3 ? 'orange' : 'red'
                  } style={{ marginLeft: 8 }}>
                    難度 {question.difficulty}
                  </Tag>
                )}
              </div>
              
              <Space size="large">
                <Space size="small">
                  <ClockCircleOutlined />
                  <Text type="secondary">添加时间: {formatDate(wrongQuestion.addedAt)}</Text>
                </Space>
                
                {wrongQuestion.reviewedAt && (
                  <Space size="small">
                    <CheckCircleOutlined />
                    <Text type="secondary">
                      最後複習: {formatDate(wrongQuestion.reviewedAt)} 
                      ({wrongQuestion.timesReviewed}次)
                    </Text>
                  </Space>
                )}
                
                {!wrongQuestion.reviewedAt && (
                  <Space size="small">
                    <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                    <Text type="warning">未複習</Text>
                  </Space>
                )}
              </Space>

              {wrongQuestion.notes && (
                <Paragraph 
                  type="secondary" 
                  style={{ margin: 0, fontSize: '12px' }}
                >
                  笔记: {wrongQuestion.notes}
                </Paragraph>
              )}
            </Space>
          }
        />
      </List.Item>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>錯題複習</Title>
              <Text type="secondary">
                共 {getWrongQuestionCount()} 道錯題，其中 {getUnreviewedCount()} 道未複習
              </Text>
            </div>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              size="large"
              onClick={handleStartPractice}
              disabled={getWrongQuestionCount() === 0}
            >
              開始錯題複習
            </Button>
          </div>

          {wrongQuestionsWithDetails.length === 0 ? (
            <Empty 
              description="暫無錯題"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              dataSource={wrongQuestionsWithDetails}
              renderItem={renderQuestionItem}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 道錯題`
              }}
            />
          )}
        </Space>
      </Card>

      <Modal
        title="编辑笔记"
        open={editingQuestion !== null}
        onOk={() => editingQuestion && handleUpdateNotes(editingQuestion)}
        onCancel={() => {
          setEditingQuestion(null);
          setEditNotes('');
        }}
        okText="保存"
        cancelText="取消"
      >
        <TextArea
          rows={4}
          placeholder="在此添加筆記或錯誤原因分析..."
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default WrongQuestionsList;