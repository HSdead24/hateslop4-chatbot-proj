from runner import start_phase2_directly, run_chat
from state import GameState, NPC_KIM, NPC_CHA, NPC_MOM, NPC_PARK, NPC_EXECUTOR
import json

def main():
    print("🎮 [로컬 테스트] 멀티 페르소나 챗봇 실행")
    print("=" * 50)
    
    # 1. 초기 상태 세팅 (Phase 1 생략 후 바로 채팅 진입)
    # 💡 여기서 원하는 스토리 ID를 바꿔가며 NPC의 초기 수치(적대감, 신뢰도 등)에 따른 말투 변화를 테스트할 수 있습니다.
    player_name = "정재희"
    player_gender = "여자"
    target_story = "story_1"  # stories.py에 정의된 스토리 (예: 김도현 적대감 MAX 스토리)
    
    state = start_phase2_directly(
        player_name=player_name, 
        player_gender=player_gender, 
        story_id=target_story
    )
    
    # 2. 대화할 캐릭터 선택
    # NPC_KIM, NPC_CHA, NPC_MOM, NPC_PARK, NPC_EXECUTOR 중 택 1
    current_npc = NPC_KIM 
    
    print(f"✅ 플레이어: {player_name} ({player_gender})")
    print(f"✅ 적용 스토리: {target_story}")
    print(f"✅ 현재 대화 상대: {current_npc}")
    print(f"✅ {current_npc} 초기 수치: {state['npc_stats'].get(current_npc, '수치 없음')}")
    print("=" * 50)
    print("대화를 시작합니다. (종료하려면 'q' 또는 'quit' 입력)")
    print("-" * 50)
    
    # 3. 대화 루프 실행
    while True:
        user_input = input(f"\n👤 {player_name}: ")
        
        if user_input.lower() in ['q', 'quit', 'exit']:
            print("테스트를 종료합니다.")
            break
            
        # runner.py의 run_chat 호출 (LangGraph 1턴 실행)
        try:
            state, response, image_url, game_status = run_chat(
                state=state,
                npc_name=current_npc,
                user_input=user_input
            )
            
            # 4. 결과 출력
            print(f"🤖 {current_npc}: {response}")
            
            if image_url:
                print(f"🖼️ [이미지 트리거됨]: {image_url}")
                
            # 5. 상태(사망/리셋) 체크
            if game_status == "loop_reset":
                print("\n☠️ [시스템] 사망 트리거 감지! 루프가 리셋됩니다.")
                break
            elif game_status == "game_over":
                print("\n💀 [시스템] 대화 횟수 초과 또는 3루프 사망. 게임 오버!")
                break
                
        except Exception as e:
            print(f"\n❌ [에러 발생]: {e}")
            break

if __name__ == "__main__":
    main()