import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Modal,
  Form,
  message,
  Popconfirm,
  Select,
  Typography,
  Row,
  Col,
  Statistic,
  Divider,
  Tabs,
  Radio,
  Checkbox,
  Tooltip
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  FolderOutlined,
  QuestionCircleOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  ExportOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Question, QuestionGroup } from '../../types';
import { useQuestionStore } from '../../stores/questionStore';
import { GetQuestions, GetQuestionGroups, SaveFileToDownloads, CreateQuestion, UpdateQuestion, DeleteQuestion } from '../../../wailsjs/go/main/App';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface QuestionManagementProps {
  onRefresh?: () => void;
}

const QuestionManagement: React.FC<QuestionManagementProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [form] = Form.useForm();

  const { questions, groups, setQuestions, setGroups, deleteQuestion, updateQuestion, addQuestion } = useQuestionStore();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter questions based on search and group selection
  useEffect(() => {
    let filtered = questions;

    // Filter by search text
    if (searchText) {
      const lowercaseSearch = searchText.toLowerCase();
      filtered = filtered.filter(q =>
        q.question.toLowerCase().includes(lowercaseSearch) ||
        q.tags?.some(tag => tag.toLowerCase().includes(lowercaseSearch)) ||
        q.source?.toLowerCase().includes(lowercaseSearch) ||
        q.options?.some(option => option.text.toLowerCase().includes(lowercaseSearch)) ||
        q.explanation?.toLowerCase().includes(lowercaseSearch)
      );
    }

    // Filter by group
    if (selectedGroup) {
      const group = groups.find(g => g.id === selectedGroup);
      if (group) {
        filtered = filtered.filter(q => group.questionIds.includes(q.id));
      }
    }

    setFilteredQuestions(filtered);
  }, [questions, searchText, selectedGroup, groups]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [questionsData, groupsData] = await Promise.all([
        GetQuestions(),
        GetQuestionGroups()
      ]);
      
      // Convert Go types to frontend types
      const convertedQuestions = (questionsData || []).map((q: any) => ({
        ...q,
        options: q.options || [],
        answer: q.answer || [],
        tags: q.tags || [],
        createdAt: q.createdAt ? new Date(q.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: q.updatedAt ? new Date(q.updatedAt).toISOString() : new Date().toISOString()
      }));
      
      const convertedGroups = (groupsData || []).map((g: any) => ({
        ...g,
        questionIds: g.questionIds || [],
        createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: g.updatedAt ? new Date(g.updatedAt).toISOString() : new Date().toISOString()
      }));
      
      setQuestions(convertedQuestions);
      setGroups(convertedGroups);
      onRefresh?.();
    } catch (error) {
      message.error('Failed to load data: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question: Question) => {
    setCurrentQuestion(question);
    form.setFieldsValue({
      question: question.question,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
      tags: question.tags,
      difficulty: question.difficulty,
      source: question.source
    });
    setEditModalVisible(true);
  };

  const handleDelete = async (questionId: string) => {
    try {
      // Delete from backend
      await DeleteQuestion(questionId);
      // Update frontend store
      deleteQuestion(questionId);
      message.success('Question deleted successfully');
    } catch (error) {
      message.error('Failed to delete question: ' + (error as Error).message);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields();
      if (!currentQuestion) return;

      const updatedQuestion = {
        ...currentQuestion,
        ...values,
        updatedAt: new Date().toISOString()
      };

      // Update in backend
      await UpdateQuestion(updatedQuestion);
      // Update frontend store
      updateQuestion(currentQuestion.id, updatedQuestion);
      setEditModalVisible(false);
      setCurrentQuestion(null);
      form.resetFields();
      message.success('Question updated successfully');
    } catch (error) {
      message.error('Failed to update question: ' + (error as Error).message);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      
      const newQuestion: Question = {
        id: '', // Let backend generate ID
        ...values,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create in backend - need to handle type conversion
      const backendQuestion = {
        ...newQuestion,
        options: JSON.stringify(newQuestion.options),
        answer: JSON.stringify(newQuestion.answer),
        tags: JSON.stringify(newQuestion.tags || [])
      };
      const createdQuestion = await CreateQuestion(backendQuestion as any);
      
      // Convert backend response back to frontend format
      const frontendQuestion: Question = {
        ...createdQuestion,
        options: JSON.parse(createdQuestion.options as any),
        answer: JSON.parse(createdQuestion.answer as any),
        tags: createdQuestion.tags ? JSON.parse(createdQuestion.tags as any) : [],
        difficulty: createdQuestion.difficulty as (1 | 2 | 3 | 4 | 5 | undefined)
      };
      
      // Update frontend store
      addQuestion(frontendQuestion);
      setCreateModalVisible(false);
      form.resetFields();
      message.success('Question created successfully');
    } catch (error) {
      message.error('Failed to create question: ' + (error as Error).message);
    }
  };

  const handleExportQuestions = async () => {
    try {
      // Get the current group name for filename
      const currentGroup = selectedGroup ? groups.find(g => g.id === selectedGroup) : null;
      const groupName = currentGroup ? currentGroup.name : 'All';
      
      // Convert filtered questions to import-compatible format
      const exportData = filteredQuestions.map(question => ({
        question: question.question,
        options: question.options.map((option: any) => ({
          id: option.id || option.text,
          text: option.text || option
        })),
        answer: question.answer,
        explanation: question.explanation || '',
        tags: question.tags || [],
        difficulty: question.difficulty || 1,
        imageUrl: question.imageUrl || '',
        source: question.source || ''
      }));

      // Create JSON content
      const dataStr = JSON.stringify(exportData, null, 2);
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `exammaster-questions-${groupName}-${timestamp}.json`;
      
      // Use Wails SaveFileToDownloads function to save the file
      await SaveFileToDownloads(filename, dataStr);
      
      message.success(`成功匯出 ${exportData.length} 個題目到下載資料夾`);
    } catch (error) {
      message.error('匯出失敗: ' + (error as Error).message);
    }
  };

  const getDifficultyColor = (difficulty?: number) => {
    if (!difficulty) return 'default';
    if (difficulty <= 2) return 'green';
    if (difficulty <= 3) return 'blue';
    if (difficulty <= 4) return 'orange';
    return 'red';
  };

  const getDifficultyText = (difficulty?: number) => {
    if (!difficulty) return '未設定';
    const levels = ['', '很簡單', '簡單', '中等', '困難', '很困難'];
    return levels[difficulty] || '未知';
  };

  const columns: ColumnsType<Question> = [
    {
      title: '題目',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true,
      width: '40%',
      render: (text: string) => (
        <Text ellipsis={{ tooltip: text }}>{text}</Text>
      )
    },
    {
      title: '選項數',
      key: 'optionsCount',
      width: '8%',
      render: (_, record) => record.options?.length || 0
    },
    {
      title: '正確答案',
      dataIndex: 'answer',
      key: 'answer',
      width: '10%',
      render: (answer: string[]) => (
        <Space wrap>
          {answer?.map(a => (
            <Tag key={a} color="green">{a}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '標籤',
      dataIndex: 'tags',
      key: 'tags',
      width: '15%',
      render: (tags: string[]) => (
        <Space wrap>
          {tags?.slice(0, 2).map(tag => (
            <Tag key={tag} color="blue">{tag}</Tag>
          ))}
          {tags?.length > 2 && <Tag>+{tags.length - 2}</Tag>}
        </Space>
      )
    },
    {
      title: '難度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: '8%',
      render: (difficulty: number) => (
        <Tag color={getDifficultyColor(difficulty)}>
          {getDifficultyText(difficulty)}
        </Tag>
      )
    },
    {
      title: '來源',
      dataIndex: 'source',
      key: 'source',
      width: '12%',
      ellipsis: true,
      render: (text: string) => text || '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: '12%',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要刪除這個題目嗎？"
            onConfirm={() => handleDelete(record.id)}
            okText="確定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              刪除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const renderStatistics = () => (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={6}>
        <Card>
          <Statistic
            title="總題目數"
            value={questions.length}
            prefix={<QuestionCircleOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="題目群組"
            value={groups.length}
            prefix={<FolderOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="已篩選"
            value={filteredQuestions.length}
            prefix={<FilterOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title={
              <Space>
                平均難度
                <Tooltip title="系統會根據您的答題表現自動調整題目難度">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </Space>
            }
            value={questions.filter(q => q.difficulty).length > 0 ? 
              (questions.filter(q => q.difficulty).reduce((sum, q) => sum + (q.difficulty || 0), 0) / 
               questions.filter(q => q.difficulty).length).toFixed(1) : 0}
            suffix="/ 5"
          />
        </Card>
      </Col>
    </Row>
  );

  const renderFilters = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16} align="middle">
        <Col flex="300px">
          <Search
            placeholder="搜尋題目、選項、解釋、標籤或來源"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={setSearchText}
            enterButton={<SearchOutlined />}
          />
        </Col>
        <Col flex="200px">
          <Select
            placeholder="選擇題目群組"
            allowClear
            style={{ width: '100%' }}
            value={selectedGroup || undefined}
            onChange={(value) => setSelectedGroup(value || '')}
          >
            {groups.map(group => (
              <Option key={group.id} value={group.id}>
                {group.name}
              </Option>
            ))}
          </Select>
        </Col>
        <Col flex="auto">
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              新增題目
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExportQuestions}
            >
              匯出
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const renderQuestionForm = () => (
    <Form form={form} layout="vertical">
      <Form.Item
        name="question"
        label="題目"
        rules={[{ required: true, message: '請輸入題目' }]}
      >
        <Input.TextArea rows={3} placeholder="請輸入題目內容" />
      </Form.Item>

      <Form.Item
        name="options"
        label="選項"
        rules={[{ required: true, message: '請輸入選項' }]}
      >
        <Form.List name="options">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'id']}
                    rules={[{ required: true, message: '請輸入選項ID' }]}
                  >
                    <Input placeholder="ID (如: a, b, c)" style={{ width: 80 }} />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'text']}
                    rules={[{ required: true, message: '請輸入選項內容' }]}
                  >
                    <Input placeholder="選項內容" style={{ width: 300 }} />
                  </Form.Item>
                  <Button type="link" onClick={() => remove(name)}>
                    刪除
                  </Button>
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  新增選項
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form.Item>

      <Form.Item
        name="answer"
        label="正確答案"
        rules={[{ required: true, message: '請選擇正確答案' }]}
      >
        <Checkbox.Group>
          <Space wrap>
            {form.getFieldValue('options')?.map((option: any) => (
              <Checkbox key={option?.id} value={option?.id}>
                {option?.id}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </Form.Item>

      <Form.Item name="explanation" label="解釋">
        <Input.TextArea rows={2} placeholder="選填：題目解釋" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="difficulty" label="難度">
            <Radio.Group>
              <Radio value={1}>很簡單</Radio>
              <Radio value={2}>簡單</Radio>
              <Radio value={3}>中等</Radio>
              <Radio value={4}>困難</Radio>
              <Radio value={5}>很困難</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="source" label="來源">
            <Input placeholder="選填：題目來源" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="tags" label="標籤">
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="輸入標籤後按 Enter"
          tokenSeparators={[',']}
        />
      </Form.Item>
    </Form>
  );

  return (
    <div style={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '16px 24px 0 24px',
        flexShrink: 0
      }}>
        <Title level={2} style={{ margin: '0 0 16px 0' }}>題庫管理</Title>
        {renderStatistics()}
        {renderFilters()}
      </div>
      
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        padding: '0 24px 24px 24px'
      }}>
        <Card>
          <Table
            columns={columns}
            dataSource={filteredQuestions}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
            size="small"
            scroll={{ x: 1200 }}
          />
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal
        title="編輯題目"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setCurrentQuestion(null);
          form.resetFields();
        }}
        width={800}
        okText="儲存"
        cancelText="取消"
      >
        {renderQuestionForm()}
      </Modal>

      {/* Create Modal */}
      <Modal
        title="新增題目"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        width={800}
        okText="建立"
        cancelText="取消"
      >
        {renderQuestionForm()}
      </Modal>
    </div>
  );
};

export default QuestionManagement;