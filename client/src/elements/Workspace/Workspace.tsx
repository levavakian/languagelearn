import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { Topbar } from '../Topbar/Topbar';
import { NewCourseModal } from '../NewCourseModal/NewCourseModal';
import { ModalSelector, useStateValue, WorkPage } from '../../state/state';
import CourseView from '../CourseView/CourseView';
import Chat from '../Chat/Chat';
import { CourseList } from '../CourseList/CourseList';
import { NewLessonModal } from '../NewLessonModal/NewLessonModal';
import { Contact } from '../Contact/Contact';
import { FAQ } from '../FAQ/FAQ';
import { Intro } from '../Intro/Intro';
import { smallScreen, useWindowSize } from '../../utils/globals';
import { CourseViewMobile } from '../CourseViewMobile/CourseViewMobile';

const Workspace = () => {
    const pageChoice = useStateValue(state => state.pageChoice);
    const modalSelector = useStateValue(state => state.modalSelector);
    const sidebarOpen = useStateValue(state => state.sidebarOpen);

    useWindowSize()
    
    return (
        <div className="flex h-svh overflow-hidden">
            <Sidebar />
            {modalSelector === ModalSelector.NewCourse && <NewCourseModal />}
            {modalSelector === ModalSelector.NewLesson && <NewLessonModal />}
            <div className={`flex flex-col flex-1 overflow-hidden bg-baby-powder relative
                ${sidebarOpen && smallScreen() ? 
                'before:absolute before:inset-0 before:pointer-events-none before:z-50 ' +
                'before:content-[""] before:block before:h-full before:w-full ' +
                'before:[background:linear-gradient(90deg,rgb(255,252,249)_0%,rgb(255,252,249)_20%,transparent_100%)] ' +
                'before:transition-[opacity] before:duration-300 ' +
                'pointer-events-none' : 
                'before:absolute before:inset-0 before:pointer-events-none before:z-50 ' +
                'before:content-[""] before:block before:h-full before:w-full ' +
                'before:[background:linear-gradient(90deg,rgb(255,252,249)_0%,rgb(255,252,249)_20%,transparent_100%)] ' +
                'before:transition-[opacity] before:duration-300 before:opacity-0'
                }`}>
                <Topbar />
                <div className="flex-1 overflow-y-auto h-svh">
                    {pageChoice.workPage === WorkPage.Course && !smallScreen() && <CourseView />}
                    {pageChoice.workPage === WorkPage.Course && smallScreen() && <CourseViewMobile />}
                    {pageChoice.workPage === WorkPage.AllCourses && <CourseList />}
                    {pageChoice.workPage === WorkPage.Chat && <Chat />}
                    {pageChoice.workPage === WorkPage.Intro && <Intro />}
                    {pageChoice.workPage === WorkPage.Contact && <Contact />}
                    {pageChoice.workPage === WorkPage.FAQ && <FAQ />}
                </div>
            </div>
        </div>
    );
};

export default Workspace;
