import React, { useState } from 'react';
import { 
  Card, 
  Upload, 
  Button, 
  Alert, 
  Progress, 
  Typography, 
  Space, 
  Select, 
  message,
  Divider 
} from 'antd';
import { InboxOutlined, UploadOutlined, BookOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { useQuestionStore } from '../../stores/questionStore';
import { ImportQuestions, InitializeDemoData } from '../../../wailsjs/go/main/App';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;

interface QuestionImportProps {
  onImportComplete?: () => void;
}

const QuestionImport: React.FC<QuestionImportProps> = ({ onImportComplete }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [initializingDemo, setInitializingDemo] = useState(false);
  
  const { groups, importQuestions } = useQuestionStore();

  const handleFileUpload: UploadProps['customRequest'] = ({ file, onSuccess, onError }) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        let jsonData: any[] = [];

        if (typeof file === 'object' && 'name' in file) {
          const fileName = file.name.toLowerCase();
          
          if (fileName.endsWith('.json')) {
            jsonData = JSON.parse(content);
          } else if (fileName.endsWith('.csv')) {
            // Simple CSV parser - you might want to use a library like papaparse
            const lines = content.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            jsonData = lines.slice(1).filter(line => line.trim()).map(line => {
              const values = line.split(',').map(v => v.trim());
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = values[index] || '';
              });
              return obj;
            });
          }

          if (jsonData.length === 0) {
            throw new Error('No valid data found in file');
          }

          setImporting(true);
          
          // Call backend import function
          const result = await ImportQuestions(jsonData, selectedGroupId);
          
          setImportResult(result);
          setImporting(false);

          if (result.success) {
            message.success(`Successfully imported ${result.imported} questions`);
            onImportComplete?.();
            onSuccess?.(result);
          } else {
            message.error('Import failed with errors');
            onError?.(new Error('Import failed'));
          }
        }
      } catch (error) {
        setImporting(false);
        message.error('Failed to process file: ' + (error as Error).message);
        onError?.(error as Error);
      }
    };

    reader.onerror = () => {
      setImporting(false);
      message.error('Failed to read file');
      onError?.(new Error('Failed to read file'));
    };

    reader.readAsText(file as Blob);
  };

  const handleInitializeDemoData = async () => {
    try {
      setInitializingDemo(true);
      const result = await InitializeDemoData();
      
      setImportResult(result);
      setInitializingDemo(false);

      if (result.success) {
        message.success(`Successfully initialized demo data with ${result.imported} questions`);
        onImportComplete?.();
      } else {
        if (result.errors.includes("Demo data already exists")) {
          message.info('Demo data has already been initialized');
        } else {
          message.error('Failed to initialize demo data');
        }
      }
    } catch (error) {
      setInitializingDemo(false);
      message.error('Failed to initialize demo data: ' + (error as Error).message);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    accept: '.json,.csv',
    customRequest: handleFileUpload,
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
    },
    onRemove: () => {
      setImportResult(null);
    },
  };

  const renderImportResult = () => {
    if (!importResult) return null;

    return (
      <Card size="small" style={{ marginTop: 16 }}>
        <Title level={5}>Import Results</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Imported: </Text>
            <Text type="success">{importResult.imported}</Text>
          </div>
          <div>
            <Text strong>Duplicates: </Text>
            <Text type="warning">{importResult.duplicates}</Text>
          </div>
          {importResult.errors.length > 0 && (
            <div>
              <Text strong>Errors: </Text>
              <Text type="danger">{importResult.errors.length}</Text>
              <Alert
                message="Import Errors"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {importResult.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                }
                type="error"
                showIcon
                style={{ marginTop: 8 }}
              />
            </div>
          )}
        </Space>
      </Card>
    );
  };

  return (
    <div style={{ 
      height: '100%',
      overflow: 'auto',
      padding: 16
    }}>
      <Card title="Import Questions">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Demo Data Section */}
        <Card size="small" type="inner" title="Quick Start">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>
              New to ExamMaster? Initialize with sample questions across different subjects to get started immediately.
            </Text>
            <Button
              type="primary"
              icon={<BookOutlined />}
              loading={initializingDemo}
              onClick={handleInitializeDemoData}
              style={{ width: 'fit-content' }}
            >
              {initializingDemo ? 'Initializing Demo Data...' : 'Initialize Demo Data'}
            </Button>
          </Space>
        </Card>

        <Divider orientation="left">Or Import Your Own Questions</Divider>

        <div>
          <Text>Select target group (optional):</Text>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Choose a group to add questions to"
            allowClear
            value={selectedGroupId || undefined}
            onChange={(value) => setSelectedGroupId(value || '')}
          >
            {groups.map(group => (
              <Option key={group.id} value={group.id}>
                {group.name}
              </Option>
            ))}
          </Select>
        </div>

        <Divider />

        <div>
          <Dragger {...uploadProps} disabled={importing}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Support for JSON and CSV files. Make sure your file follows the required format.
            </p>
          </Dragger>
        </div>

        {importing && (
          <div>
            <Progress percent={100} status="active" />
            <Text>Importing questions...</Text>
          </div>
        )}

        {renderImportResult()}

        <Alert
          message="Supported File Formats"
          description={
            <div>
              <p><strong>JSON Format:</strong></p>
              <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px' }}>
{`[
  {
    "question": "What is React?",
    "options": [
      {"id": "a", "text": "A library"},
      {"id": "b", "text": "A framework"},
      {"id": "c", "text": "A language"}
    ],
    "answer": ["a"],
    "explanation": "React is a JavaScript library for building user interfaces.",
    "tags": ["react", "javascript"],
    "difficulty": 2,
    "source": "React Documentation",
    "group": "JavaScript Frameworks"
  }
]`}
              </pre>
              <p><strong>CSV Format:</strong> First row should contain column headers. Supported columns:</p>
              <ul style={{ fontSize: '12px', marginLeft: '20px' }}>
                <li><strong>question</strong> (必填): 題目內容</li>
                <li><strong>options</strong> (必填): JSON格式選項 [{`{"id":"a","text":"選項A"},{"id":"b","text":"選項B"}`}]</li>
                <li><strong>answer</strong> (必填): JSON格式答案 ["a"] 或 ["a","b"]</li>
                <li><strong>explanation</strong> (選填): 題目解釋</li>
                <li><strong>tags</strong> (選填): JSON格式標籤 ["tag1","tag2"]</li>
                <li><strong>difficulty</strong> (選填): 難度 1-5 (系統會根據答題表現動態調整)</li>
                <li><strong>source</strong> (選填): 題目來源</li>
                <li><strong>group</strong> (選填): 群組名稱 (若不存在會自動創建)</li>
              </ul>
            </div>
          }
          type="info"
          showIcon
        />
        </Space>
      </Card>
    </div>
  );
};

export default QuestionImport;