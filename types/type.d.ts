export interface LoginResponse {
    jwt: string;
    user: {
        id: number;
        username: string;
        email: string;
        provider: string;
        confirmed: boolean;
        blocked: boolean;
        createdAt: string;
        updatedAt: string;
        documentId: string;
    };
}

export interface RegisterResponse {
    jwt: string;
    user: {
        id: number;
        username: string;
        email: string;
        provider: string;
        confirmed: boolean;
        blocked: boolean;
        createdAt: string;
        updatedAt: string;
        documentId: string;
    };
}

export interface ErrorResponse {
    error: {
        status: string; // HTTP status
        name: string; // Strapi error name ('ApplicationError' or 'ValidationError')
        message: string; // A human readable error message
        details: {
            [key: string]: string;
        };
    }
}

export interface AuthContextObject {
    authenticated: boolean;
    userName: string;
    email: string;
    jwt: string;
    id: string;
    documentId: string;
    setAuthenticated: (authenticated: boolean) => void;
    setJwt: (jwt: string) => void;
    setUserName: (userName: string) => void;
    setEmail: (email: string) => void;
    setDocumentId: (documentId: string) => void;
    setId: (id: string) => void;
    logout: () => Promise<void>;
}

export interface Student {
    name: string;
    studentId: string;
    documentId: string;
    publishedAt: string;
}

export interface User {
    documentId: string;
    id: string;
    userName: string;
    email: string;
}

export interface Class {
    name: string;
    documentId: string;
    publishedAt: string;
    students: Student[];
    teacher: User;
}


export interface ExamSchedule {
    documentId: string;
    name: string;
    exam: ExamResponse;
    class: Class;
    teacher: User;
    result: ExamScheduleResult;
}

/**
 * CREATED: 已经创建Schedule,但还没有上传PDF
 * UPLOADED: 已经上传PDF,但还没有开始流水线
 * DONE: 流水线已经完成,可以去查看结果
 */
type ExamScheduleProgress = 'CREATED' | 'UPLOADED' | 'DONE'

// 在试卷提交后的所有数据
export interface ExamScheduleResult {
    progress: ExamScheduleProgress;
    pdfUrl: string; // 试卷PDF的url, '/uploads/exam_scan_732425fbd9.pdf
    papers: Paper[]; // 在服务器切割完PDF后设置这个字段
    studentPapers: StudentPaper[]; // 学生答卷,根据卷头信息匹配对应的paper
}

export interface Paper {
    paperId: string; // 试卷id
    startPage: number; // 开始页码
    endPage: number; // 结束页码
}

export interface StudentPaper {
    student: Student;
    paperId: string; // 答卷id，未匹配为null,这个ID会在拆分PDF的时候生成
    headerRecognition: {
        name: string;
        id: string
    },
    objectiveQuestions: ObjectiveQuestion[];
    subjectiveQuestions: SubjectiveQuestion[];
    totalScore: number; // 从0往上加
}

export interface ObjectiveQuestion {
    questionNumber: number;
    studentAnswer: string[];
    score: number;
}

export interface SubjectiveQuestion {
    questionNumber: number;
    studentAnswer: string;
    aiSuggestion: string;
    score: number;
}
