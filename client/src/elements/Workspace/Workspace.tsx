import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { Topbar } from '../Topbar/Topbar';
import './Workspace.css';
import { useStateValue, WorkPage } from '../../state/state';
import CourseView from '../CourseView/CourseView';
import Chat from '../Chat/Chat';

const Workspace = () => {
    const pageChoice = useStateValue(state => state.pageChoice);

    return (
        <div className="workspace-container">
            <Sidebar />
            <div className="workspace-main">
                <Topbar />
                <div className="workspace-content">
                    {pageChoice.workPage === WorkPage.Course && <CourseView />}
                    {pageChoice.workPage === WorkPage.AllCourses && (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                            {[...Array(100)].map((_, i) => (
                                <div key={i}>All Courses</div>
                            ))}
                        </div>
                    )}
                    {pageChoice.workPage === WorkPage.Lesson && <span>Lesson</span>}
                    {pageChoice.workPage === WorkPage.Chat && <Chat />}
                    {pageChoice.workPage === WorkPage.Intro && <span>Intro</span>}
                </div>
            </div>
        </div>
    );
};

export default Workspace;
