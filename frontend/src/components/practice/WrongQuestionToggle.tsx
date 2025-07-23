import React, { useState, useEffect } from 'react';
import { Button, Tooltip, message, Modal, Input } from 'antd';
import { BookOutlined, DeleteOutlined } from '@ant-design/icons';
import { useWrongQuestionStore } from '../../stores/wrongQuestionStore';

const { TextArea } = Input;

interface WrongQuestionToggleProps {
  questionId: string;
  size?: 'small' | 'middle' | 'large';
  type?: 'default' | 'primary' | 'text';
  showText?: boolean;
}

const WrongQuestionToggle: React.FC<WrongQuestionToggleProps> = ({
  questionId,
  size = 'small',
  type = 'text',
  showText = false
}) => {
  const { 
    toggleWrongQuestion, 
    isQuestionMarkedWrong 
  } = useWrongQuestionStore();
  
  const [isMarked, setIsMarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const marked = await isQuestionMarkedWrong(questionId);
        setIsMarked(marked);
      } catch (error) {
        console.error('Failed to check wrong question status:', error);
      }
    };
    
    checkStatus();
  }, [questionId, isQuestionMarkedWrong]);

  const handleToggle = async () => {
    if (!isMarked) {
      // Adding to wrong questions - show notes modal
      setShowNotesModal(true);
    } else {
      // Removing directly
      try {
        setLoading(true);
        const newStatus = await toggleWrongQuestion(questionId, '');
        setIsMarked(newStatus);
        message.success(newStatus ? '已添加到錯題本' : '已從錯題本移除');
      } catch (error) {
        message.error('操作失败');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleConfirmAdd = async () => {
    try {
      setLoading(true);
      const newStatus = await toggleWrongQuestion(questionId, notes);
      setIsMarked(newStatus);
      setShowNotesModal(false);
      setNotes('');
      message.success('已添加到錯題本');
    } catch (error) {
      message.error('添加失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAdd = () => {
    setShowNotesModal(false);
    setNotes('');
  };

  const buttonProps = {
    size,
    type: isMarked ? 'primary' : type,
    loading,
    onClick: handleToggle,
    icon: isMarked ? <BookOutlined /> : <BookOutlined />,
    danger: isMarked,
    style: isMarked ? { backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' } : undefined
  };

  return (
    <>
      <Tooltip title={isMarked ? '從錯題本中移除' : '添加到錯題本'}>
        <Button {...buttonProps}>
          {showText && (isMarked ? '移除錯題' : '加入錯題本')}
        </Button>
      </Tooltip>

      <Modal
        title="添加到錯題本"
        open={showNotesModal}
        onOk={handleConfirmAdd}
        onCancel={handleCancelAdd}
        okText="添加"
        cancelText="取消"
        confirmLoading={loading}
      >
        <div style={{ marginBottom: 16 }}>
          <p>將此題添加到錯題本，方便後續複習。</p>
        </div>
        <TextArea
          rows={4}
          placeholder="可以添加筆記，記錄錯誤原因或重點知識..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Modal>
    </>
  );
};

export default WrongQuestionToggle;